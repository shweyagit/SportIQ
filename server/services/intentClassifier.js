/**
 * intentClassifier.js
 *
 * Classifies the user's query intent before retrieval so we can:
 *  - Skip retrieval entirely for opinion questions (no player facts needed)
 *  - Retrieve only stats docs for factual stat questions
 *  - Retrieve only narrative docs for technique questions
 *  - Retrieve both for comparisons and general questions
 *
 * This moves retrieval from "always retrieve everything" to intent-driven,
 * which is the key characteristic of Smart RAG over Naive RAG.
 */

const INTENT_TYPES = {
  OPINION:    "opinion",          // "Is the Premier League ruining football?" — no retrieval needed
  STATS:      "player_stats",     // "What are Messi's career goals?" — retrieve stats docs only
  TECHNIQUE:  "player_technique", // "How does Federer serve?" — retrieve narrative docs only
  COMPARISON: "comparison",       // "Messi vs Ronaldo" — retrieve both types
  GENERAL:    "general",          // everything else — retrieve both types
};

async function classifyIntent(question, sport) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // fast + cheap for classification
        max_tokens: 100,
        system: `You are a query intent classifier for a sports AI platform.
Classify the user's question into exactly one of these intents:
- opinion: subjective debate with no specific player stats needed (e.g. "Is VAR ruining football?")
- player_stats: needs specific career numbers, records, or statistics
- player_technique: needs playing style, technique, or tactical analysis
- comparison: comparing two or more players against each other
- general: anything else

Respond ONLY with raw JSON: {"intent":"<type>","reason":"one short sentence"}`,
        messages: [{ role: "user", content: `Sport: ${sport}\nQuestion: ${question}` }],
      }),
    });

    if (!res.ok) throw new Error(`Claude error ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.content[0].text);

    console.log(`[INTENT] "${question.slice(0, 60)}..." → ${parsed.intent} (${parsed.reason})`);
    return { intent: parsed.intent, reason: parsed.reason };
  } catch (err) {
    console.warn(`[INTENT] Classification failed, defaulting to general: ${err.message}`);
    return { intent: INTENT_TYPES.GENERAL, reason: "fallback" };
  }
}

module.exports = { classifyIntent, INTENT_TYPES };
