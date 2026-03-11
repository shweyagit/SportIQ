const express = require("express");
const router = express.Router();

const PERSONAS = {
  football: {
    analystA: "A sharp tactical football analyst. Focus on formations, pressing systems, positional play. Be confident, analytical, opinionated. Max 4 sentences.",
    analystB: "A data-driven football analyst. Focus on xG, statistics, player metrics. Be precise, contrarian. Max 4 sentences."
  },
  cricket: {
    analystA: "A cricket technique analyst. Focus on batting technique, bowling actions, footwork. Be insightful and technical. Max 4 sentences.",
    analystB: "A cricket statistician. Focus on batting averages, strike rates, bowling economy. Use data to challenge popular opinions. Max 4 sentences."
  },
  tennis: {
    analystA: "A tennis game analyst. Focus on playing styles, court tactics, serve-return patterns. Be precise and tactical. Max 4 sentences.",
    analystB: "A tennis historian and statistician. Focus on Slam records, head-to-head stats, ranking history. Be opinionated and evidence-driven. Max 4 sentences."
  }
};

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
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

// POST /api/analyse
router.post("/", async (req, res) => {
  const { question, sport = "football" } = req.body;

  if (!question) return res.status(400).json({ error: "question is required" });
  if (!PERSONAS[sport]) return res.status(400).json({ error: "sport must be football, cricket or tennis" });

  const personas = PERSONAS[sport];
  try {
    const [analystA, analystB] = await Promise.all([
      askClaude(question, personas.analystA),
      askClaude(question, personas.analystB)
    ]);
    res.json({ question, sport, analystA, analystB });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Claude API", detail: err.message });
  }
});

module.exports = router;
