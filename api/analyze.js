export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // API key lives only on the server — never sent to the browser
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { base64Data, mediaType } = req.body;
  if (!base64Data || !mediaType) {
    return res.status(400).json({ error: "Missing image data" });
  }

  const prompt = `You are a design system expert. Analyze this UI design image and extract design tokens.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "brandName": "guess a brand name from the UI or use 'My Brand'",
  "primaryColor": "#hexcode of the dominant brand/action color",
  "secondaryColor": "#hexcode of a secondary accent color",
  "neutralColor": "#hexcode of the darkest neutral/text color",
  "successColor": "#hexcode for success states (use #22C55E if unclear)",
  "warningColor": "#hexcode for warning states (use #F59E0B if unclear)",
  "errorColor": "#hexcode for error/danger states (use #EF4444 if unclear)",
  "displayFont": "closest matching font from this list: Playfair Display, DM Sans, Sora, Fraunces, Plus Jakarta Sans, Epilogue, Space Grotesk, Raleway, Nunito, Libre Baskerville, Lora",
  "bodyFont": "closest matching body font from the same list",
  "monoFont": "JetBrains Mono",
  "baseFontSize": "16",
  "borderRadius": "estimate in px as a number string: 0 for sharp, 4-8 for subtle, 12-16 for rounded, 24 for very rounded",
  "spacing": "8",
  "aiNotes": "2-3 sentences describing the design style, mood, and key visual characteristics you observed"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: prompt }
          ]
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Anthropic API error:", err);
    return res.status(500).json({ error: "Failed to analyze image" });
  }
}
