const express = require("express");
const router = express.Router();
const { retrieveContext } = require("../rag");

const PERSONAS = {
  football: {
    tactician: "You are a tactical football analyst. Reason from technique, style, formations, pressing systems, and positional play. Cite specific movements, tendencies, and how players adapt tactically. Be confident and opinionated. Max 4 sentences.",
    statistician: "You are a football data analyst. Reason strictly from the statistics and numbers provided in the context. Cite specific figures — xG, pass completion, goals, assists, per-90 metrics. Challenge conventional wisdom with data. Be precise. Max 4 sentences."
  },
  cricket: {
    tactician: "You are a cricket technique analyst. Reason from batting stance, footwork, shot selection, bowling actions, and playing style. Describe how players move, their strengths against pace vs spin, and their special skills. Be technical and insightful. Max 4 sentences.",
    statistician: "You are a cricket statistician. Reason strictly from the statistics provided in the context. Cite specific figures — batting averages, strike rates, economy rates, centuries, fifties, performance splits. Use data to challenge popular opinions. Max 4 sentences."
  },
  tennis: {
    tactician: "You are a tennis game analyst. Reason from playing style, court tactics, serve-return patterns, surface adaptation, and mental game. Describe technique, movement, and how players construct points. Be precise and tactical. Max 4 sentences.",
    statistician: "You are a tennis statistician and historian. Reason strictly from the statistics provided in the context. Cite specific figures — Grand Slam titles, head-to-head records, ranking history, win percentages by surface. Be evidence-driven. Max 4 sentences."
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
      model: "claude-sonnet-4-6",
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
    // Each analyst retrieves from their own knowledge type
    const [tacticianRAG, statisticianRAG] = await Promise.all([
      retrieveContext(question, sport, "narrative"),
      retrieveContext(question, sport, "stats"),
    ]);

    const tacticianPrompt = tacticianRAG.context
      ? `Reference context (technique & style):\n${tacticianRAG.context}\n\nQuestion: ${question}`
      : question;

    const statisticianPrompt = statisticianRAG.context
      ? `Reference context (statistics & data):\n${statisticianRAG.context}\n\nQuestion: ${question}`
      : question;

    const [tactician, statistician] = await Promise.all([
      askClaude(tacticianPrompt, personas.tactician),
      askClaude(statisticianPrompt, personas.statistician),
    ]);

    res.json({
      question,
      sport,
      tactician,
      statistician,
      sources: {
        tactician: tacticianRAG.sources,
        statistician: statisticianRAG.sources,
      },
    });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Claude API", detail: err.message });
  }
});

module.exports = router;
