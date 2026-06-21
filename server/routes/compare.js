const express = require("express");
const router = express.Router();
const { retrieveContext } = require("../rag");

async function askClaude(prompt, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      temperature: 0,
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

  // Sort alphabetically so "Messi vs Ronaldo" and "Ronaldo vs Messi" always produce the same prompt
  const [pA, pB] = [player1, player2].sort();

  try {
    const { context } = await retrieveContext(`${pA} ${pB} ${sport} comparison`, sport);
    const prompt = context
      ? `Reference context (use if relevant):\n${context}\n\nCompare ${pA} vs ${pB} as ${sport} players.`
      : `Compare ${pA} vs ${pB} as ${sport} players.`;

    const raw = await askClaude(
      prompt,
      `You are a ${sport} analyst. Respond ONLY with raw JSON: {"player1":{"name":"${pA}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"player2":{"name":"${pB}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"verdict":"2-3 sentence verdict","winner":"name"}`
    );
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Restore original order in response so UI shows players as the user typed them
    const ordered = player1.toLowerCase() === pA.toLowerCase()
      ? result
      : { ...result, player1: result.player2, player2: result.player1 };

    res.json({ sport, ...ordered });
  } catch (err) {
    res.status(502).json({ error: "Comparison failed", detail: err.message });
  }
});

module.exports = router;
