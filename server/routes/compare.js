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
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

// POST /api/compare
router.post("/", async (req, res) => {
  const { player1, player2, sport = "football" } = req.body;
  if (!player1 || !player2) return res.status(400).json({ error: "player1 and player2 are required" });

  try {
    const raw = await askClaude(
      `Compare ${player1} vs ${player2} as ${sport} players.`,
      `You are a ${sport} analyst. Respond ONLY with raw JSON: {"player1":{"name":"${player1}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"player2":{"name":"${player2}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"verdict":"2-3 sentence verdict","winner":"name"}`
    );
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ sport, ...result });
  } catch (err) {
    res.status(502).json({ error: "Comparison failed", detail: err.message });
  }
});

module.exports = router;
