# 🚀 DesignTokens — Setup Guide

Follow these steps exactly and your app will be live in about 15 minutes.
No coding experience needed — just click by click.

---

## What you'll need (all free)
- A **GitHub** account → github.com
- A **Vercel** account → vercel.com
- Your **Anthropic API key** → console.anthropic.com

---

## STEP 1 — Get your Anthropic API Key

1. Go to **console.anthropic.com**
2. Sign in (or create a free account)
3. Click **"API Keys"** in the left sidebar
4. Click **"Create Key"**, give it a name like `design-tokens`
5. **Copy the key** — it starts with `sk-ant-...`
6. Save it somewhere safe (like Notes) — you'll need it in Step 4

> ⚠️ Never share this key or put it in any code file. We'll add it safely in Vercel.

---

## STEP 2 — Put your project on GitHub

1. Go to **github.com** and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Name it `design-tokens`
4. Make sure it's set to **Public**
5. Click **"Create repository"**
6. On the next page, click **"uploading an existing file"**
7. Upload ALL the files from the project folder maintaining this structure:

```
design-tokens/
├── api/
│   └── analyze.js        ← the secure API proxy
├── src/
│   ├── App.jsx           ← your main app
│   └── main.jsx          ← React entry point
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```

> 💡 Tip: You can drag and drop multiple files at once onto GitHub's upload page.
> Make sure to recreate the `api/` and `src/` folders — GitHub lets you type folder
> names by typing `api/analyze.js` as the filename.

8. Scroll down, click **"Commit changes"**

---

## STEP 3 — Deploy on Vercel

1. Go to **vercel.com** and click **"Sign Up"**
2. Choose **"Continue with GitHub"** — this connects your GitHub account
3. Click **"Add New Project"**
4. Find your `design-tokens` repository and click **"Import"**
5. Vercel will auto-detect everything — don't change any settings
6. Click **"Deploy"**
7. Wait about 60 seconds — you'll see a success screen with a URL like:
   `https://design-tokens-yourname.vercel.app`

> 🎉 The app is live! But the image analysis won't work yet — we need to add your API key.

---

## STEP 4 — Add your API Key (the secure part)

This is the important step. Your API key will live on Vercel's servers — never in your code.

1. In Vercel, click on your project
2. Click the **"Settings"** tab at the top
3. Click **"Environment Variables"** in the left sidebar
4. Fill in:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste your key from Step 1 (the `sk-ant-...` one)
   - **Environment:** make sure all three are checked (Production, Preview, Development)
5. Click **"Save"**
6. Go back to the **"Deployments"** tab
7. Click the three dots `...` next to your latest deployment → **"Redeploy"**
8. Wait ~60 seconds

✅ **Done! Your app is now fully live and secure.**

---

## STEP 5 — Share with your team

Copy your Vercel URL and send it to anyone on your team:
```
https://design-tokens-yourname.vercel.app
```

They can open it in any browser — no installs, no sign-in needed.

---

## Updating the app in the future

Whenever you want to make changes:
1. Edit the files locally
2. Upload the changed files to GitHub (same repo, same path)
3. Vercel will automatically redeploy within ~60 seconds

---

## Troubleshooting

**Image analysis not working?**
→ Double-check your API key in Vercel's Environment Variables
→ Make sure you redeployed after adding the key

**App not loading?**
→ Check Vercel's "Deployments" tab for any red error messages
→ Make sure all files are in the right folders on GitHub

**Getting a blank page?**
→ Make sure `index.html`, `src/main.jsx`, and `src/App.jsx` are all uploaded correctly

---

## File structure explained (for your reference)

| File | What it does |
|------|-------------|
| `src/App.jsx` | Your entire app UI |
| `src/main.jsx` | Starts the React app |
| `api/analyze.js` | Secure server that calls Anthropic — your API key lives here |
| `index.html` | The HTML shell |
| `package.json` | Lists the libraries the app needs |
| `vite.config.js` | Build tool settings |
| `vercel.json` | Tells Vercel how to route API calls |
| `.gitignore` | Prevents secrets from being uploaded to GitHub |
