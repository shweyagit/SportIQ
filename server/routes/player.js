const express = require("express");
const router = express.Router();

async function askClaude(prompt, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function getPlayerImage(name) {
  try {
    // 1. Wikipedia direct
    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    const wikiData = await wikiRes.json();
    if (wikiData.originalimage?.source) return wikiData.originalimage.source;
    if (wikiData.thumbnail?.source) return wikiData.thumbnail.source.replace(/\/\d+px-/, "/400px-");

    // 2. TheSportsDB
    const sdbRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
    const sdbData = await sdbRes.json();
    const player = sdbData?.player?.[0];
    if (player?.strThumb) return player.strThumb;

    return null;
  } catch { return null; }
}

// POST /api/player
router.post("/", async (req, res) => {
  const { name, sport = "football" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    const raw = await askClaude(
      `Profile of ${name} as a ${sport} player.`,
      `You are a ${sport} encyclopedia. Respond ONLY with raw JSON: {"name":"full name","nationality":"country","position":"position","currentTeam":"team or retired","age":"age","careerSummary":"2-3 sentences","achievements":["a1","a2","a3"],"keyStats":["s1","s2","s3"],"legacyQuote":"one sentence"}`
    );
    const profile = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const image = await getPlayerImage(profile.name);
    res.json({ ...profile, image });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch player profile", detail: err.message });
  }
});

// GET /api/player/image?name=Cristiano+Ronaldo
router.get("/image", async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "name query param is required" });
  const image = await getPlayerImage(name);
  if (!image) return res.status(404).json({ error: "No image found for this player" });
  res.json({ name, image });
});

module.exports = router;
