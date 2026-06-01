const express = require("express");
const router = express.Router();
const { retrieveContext, storeDocument } = require("../rag");
const { fetchPlayerDoc } = require("../services/sportsdb");
const { createClient } = require("@supabase/supabase-js");

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

// Ingest player from TheSportsDB if not already in the knowledge base
async function autoIngestPlayer(name) {
  if (!supabase) return;
  try {
    const normalised = name.toLowerCase();

    // Check if already ingested
    const { data } = await supabase
      .from("sports_docs")
      .select("id")
      .eq("metadata->>source", "sportsdb")
      .eq("metadata->>playerName", normalised)
      .limit(1);

    if (data?.length) return; // already in KB

    const doc = await fetchPlayerDoc(name);
    if (!doc) return;

    await storeDocument(doc.content, doc.metadata, doc.sport);
    console.log(`[RAG] Auto-ingested: ${name}`);
  } catch (err) {
    console.warn(`[RAG] Auto-ingest failed for ${name}:`, err.message);
  }
}

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
    // 1. TheSportsDB first — sport-specific, less likely to confuse namesakes
    const sdbRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
    const sdbData = await sdbRes.json();
    const player = sdbData?.player?.[0];
    if (player?.strThumb) return player.strThumb;

    // 2. Wikipedia fallback
    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    const wikiData = await wikiRes.json();
    if (wikiData.originalimage?.source) return wikiData.originalimage.source;
    if (wikiData.thumbnail?.source) return wikiData.thumbnail.source.replace(/\/\d+px-/, "/400px-");

    return null;
  } catch { return null; }
}

// POST /api/player
router.post("/", async (req, res) => {
  const { name, sport = "football" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  // Validate player exists in TheSportsDB and matches the requested sport
  const SPORT_MAP = { football: "Soccer", cricket: "Cricket", tennis: "Tennis" };
  try {
    const checkRes = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`
    );
    const checkData = await checkRes.json();
    const players = checkData?.player;
    if (!players?.length) {
      return res.status(404).json({ error: `No player found for "${name}". Please check the spelling or try a different name.` });
    }
    const expectedSport = SPORT_MAP[sport];
    const match = players.find(p => p.strSport === expectedSport);
    if (!match) {
      const foundSport = players[0].strSport;
      return res.status(404).json({ error: `"${name}" was found but not as a ${sport} player (found in ${foundSport}). Try searching in the right sport.` });
    }
  } catch {
    // If TheSportsDB is unreachable, proceed anyway
  }

  // Fire-and-forget: ingest from TheSportsDB in the background
  autoIngestPlayer(name);

  try {
    const context = await retrieveContext(`${name} ${sport} player profile`, sport);
    const prompt = context
      ? `Reference context (use if relevant):\n${context}\n\nProfile of ${name} as a ${sport} player.`
      : `Profile of ${name} as a ${sport} player.`;

    const raw = await askClaude(
      prompt,
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
