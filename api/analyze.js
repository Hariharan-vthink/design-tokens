export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY environment variable");
    return res.status(500).json({ error: "API key not configured on server" });
  }

  const { base64Data, mediaType } = req.body || {};
  if (!base64Data || !mediaType) {
    return res.status(400).json({ error: "Missing base64Data or mediaType in request body" });
  }

  const prompt = `You are a design system expert. Analyze this UI design image and extract design tokens.

Return ONLY a valid JSON object with exactly these fields (no markdown, no code blocks, no explanation, just raw JSON):
{
  "brandName": "guess a brand name from the UI or use My Brand",
  "primaryColor": "#hexcode of the dominant brand/action color",
  "secondaryColor": "#hexcode of a secondary accent color",
  "neutralColor": "#hexcode of the darkest neutral/text color",
  "successColor": "#22C55E",
  "warningColor": "#F59E0B",
  "errorColor": "#EF4444",
  "displayFont": "closest match from: Playfair Display, DM Sans, Sora, Fraunces, Plus Jakarta Sans, Epilogue, Space Grotesk, Raleway, Nunito, Libre Baskerville, Lora",
  "bodyFont": "closest match from the same list above",
  "monoFont": "JetBrains Mono",
  "baseFontSize": "16",
  "borderRadius": "8",
  "spacing": "8",
  "aiNotes": "2-3 sentences describing the design style and mood"
}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data }
            },
            { type: "text", text: prompt }
          ]
        }]
      }),
    });

    // Log the status so we can see it in Vercel logs
    console.log("Anthropic response status:", anthropicRes.status);

    const raw = await anthropicRes.text();
    console.log("Anthropic raw response:", raw.slice(0, 500));

    if (!anthropicRes.ok) {
      console.error("Anthropic API error:", raw);
      return res.status(500).json({ error: `Anthropic error ${anthropicRes.status}: ${raw}` });
    }

    const data = JSON.parse(raw);
    const text = data.content?.find(b => b.type === "text")?.text || "";

    // Strip any markdown code fences if present
    const clean = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Find the JSON object inside the response
    const jsonStart = clean.indexOf("{");
    const jsonEnd = clean.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No JSON found in response:", clean);
      return res.status(500).json({ error: "Could not find JSON in AI response" });
    }

    const jsonStr = clean.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
