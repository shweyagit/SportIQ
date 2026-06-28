const express = require("express");
const router = express.Router();
const { retrieveContext } = require("../rag");
const { classifyIntent, INTENT_TYPES } = require("../services/intentClassifier");

const PERSONAS = {
  football: {
    tactician: "You are the world's foremost tactical football analyst — the analyst managers call before a final, the voice coaches trust over any pundit. You see the game in movements, shapes, and decisions that others miss. Reason from technique, pressing triggers, positional rotations, and how players exploit or expose space. Be bold, specific, and opinionated. Never hedge. Max 4 sentences.",
    statistician: "You are the most rigorous football data analyst in the world — the person who changes minds with a single number. You reason strictly from statistics: xG, press success rate, pass completion under pressure, per-90 output, progressive carries. When the data contradicts the narrative, you say so plainly. Be precise, cite specific figures, and never speculate beyond what the numbers show. Max 4 sentences."
  },
  cricket: {
    tactician: "You are the finest cricket technique analyst alive — the expert commentators defer to when they cannot explain what they just saw. You break down batting stances, trigger movements, weight transfer, bowling seam positions, and field placements with surgical precision. You see technical flaws and genius that others overlook. Be authoritative, specific, and never vague. Max 4 sentences.",
    statistician: "You are the most respected cricket statistician in the world — the analyst who has every average, economy rate, and split memorised and knows exactly what they mean. Reason strictly from the numbers: batting averages, strike rates, wicket splits, series records, format-by-format breakdowns. Use data to cut through mythology. Be precise, cite specific figures, and let the numbers speak. Max 4 sentences."
  },
  tennis: {
    tactician: "You are the greatest tennis tactical mind of your generation — the analyst whose breakdowns of serve patterns, return positioning, and point construction have shaped how the modern game is understood. You see tactics, footwork, grip adjustments, and mental shifts that broadcast commentary misses entirely. Be precise, confident, and specific about how players construct and dismantle opponents. Max 4 sentences.",
    statistician: "You are the definitive tennis statistician — the authority on Grand Slam records, head-to-head history, surface splits, and what the numbers actually reveal about greatness. Reason strictly from statistics: titles, win percentages, ranking weeks, clutch performance data. When the data tells a different story from the popular opinion, you say so directly. Be exact and evidence-driven. Max 4 sentences."
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

// POST /api/analyse/stream — SSE streaming, one token at a time per analyst
router.post("/stream", async (req, res) => {
  const { question, sport = "football" } = req.body;
  if (!question) return res.status(400).json({ error: "question is required" });
  if (!PERSONAS[sport]) return res.status(400).json({ error: "sport must be football, cricket or tennis" });

  const start = Date.now();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Step 1 — classify intent to decide retrieval strategy
    const { intent, reason } = await classifyIntent(question, sport);
    send({ type: "intent", intent, reason });

    // Step 2 — retrieve based on intent (Smart RAG routing)
    let tacticianRAG   = { context: "", sources: [], belowThreshold: false };
    let statisticianRAG = { context: "", sources: [], belowThreshold: false };

    if (intent === INTENT_TYPES.OPINION) {
      // Opinion questions don't need retrieval — Claude reasons from its own knowledge
      console.log(`[RAG] Skipping retrieval for opinion question`);
    } else if (intent === INTENT_TYPES.STATS) {
      // Only retrieve stats docs — no need for narrative context
      statisticianRAG = await retrieveContext(question, sport, "stats");
    } else if (intent === INTENT_TYPES.TECHNIQUE) {
      // Only retrieve narrative docs — no need for stats context
      tacticianRAG = await retrieveContext(question, sport, "narrative");
    } else {
      // comparison or general — retrieve both in parallel
      [tacticianRAG, statisticianRAG] = await Promise.all([
        retrieveContext(question, sport, "narrative"),
        retrieveContext(question, sport, "stats"),
      ]);
    }

    console.log(`[RAG] ${sport} | intent=${intent} | tactician=${tacticianRAG.sources.length} docs, statistician=${statisticianRAG.sources.length} docs`);
    send({ type: "sources", tactician: tacticianRAG.sources, statistician: statisticianRAG.sources });

    // Step 3 — build prompts, explicitly flagging when no quality context was found
    const makePrompt = (ctx, belowThreshold, label) => {
      if (intent === INTENT_TYPES.OPINION) return `Opinion question — reason from your own expertise.\n\nQuestion: ${question}`;
      if (belowThreshold) return `No relevant context was found in the knowledge base for this question. Answer from your own expertise.\n\nQuestion: ${question}`;
      return ctx
        ? `Reference context (${label}):\n${ctx}\n\nQuestion: ${question}`
        : `Question: ${question}`;
    };

    async function streamAnalyst(systemPrompt, contextPrompt, tokenType) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          stream: true,
          system: systemPrompt,
          messages: [{ role: "user", content: contextPrompt }]
        })
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.json();
        throw new Error(err.error?.message || `Claude error ${claudeRes.status}`);
      }

      const reader = claudeRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return;
          try {
            const event = JSON.parse(raw);
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              send({ type: tokenType, token: event.delta.text });
            }
          } catch {}
        }
      }
    }

    await Promise.all([
      streamAnalyst(PERSONAS[sport].tactician, makePrompt(tacticianRAG.context, tacticianRAG.belowThreshold, "technique & style"), "tactician"),
      streamAnalyst(PERSONAS[sport].statistician, makePrompt(statisticianRAG.context, statisticianRAG.belowThreshold, "statistics & data"), "statistician"),
    ]);

    send({ type: "done" });
    console.log(`[STREAM] ${sport} | ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`[STREAM] Error: ${err.message}`);
    send({ type: "error", message: err.message });
  }

  res.end();
});

module.exports = router;
