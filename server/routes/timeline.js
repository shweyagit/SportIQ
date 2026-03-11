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

// POST /api/timeline
router.post("/", async (req, res) => {
  const { name, sport = "football" } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    const raw = await askClaude(
      `Career timeline of ${name} in ${sport}.`,
      `You are a ${sport} historian. Respond ONLY with raw JSON: {"name":"player name","events":[{"year":"YYYY","event":"short description","type":"debut|transfer|trophy|milestone|retirement"}]} Include 6-10 key career moments.`
    );
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ sport, ...result });
  } catch (err) {
    res.status(502).json({ error: "Failed to generate timeline", detail: err.message });
  }
});

module.exports = router;
