const express = require("express");
const router = express.Router();
const { retrieveContext } = require("../rag");
const { classifyIntent, INTENT_TYPES } = require("../services/intentClassifier");

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
