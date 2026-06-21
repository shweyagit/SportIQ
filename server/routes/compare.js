const express = require("express");
const router = express.Router();
const { retrieveContext } = require("../rag");
const { fetchFootballStats, calculateScore, buildStatsContext } = require("../services/footballStats");

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

  // Sort alphabetically — makes prompt deterministic regardless of input order
  const [pA, pB] = [player1, player2].sort();

  try {
    // ── Football: fetch real stats and calculate position-aware scores ─────────
    let statsA = null, statsB = null, scoreA = null, scoreB = null;
    let scoringMethod = "claude"; // flag for response transparency

    if (sport === "football" && process.env.FOOTBALL_API_KEY) {
      [statsA, statsB] = await Promise.all([
        fetchFootballStats(pA),
        fetchFootballStats(pB),
      ]);
      scoreA = calculateScore(statsA);
      scoreB = calculateScore(statsB);

      if (scoreA !== null && scoreB !== null) {
        scoringMethod = "calculated";
        console.log(`[COMPARE] Stats-based scores — ${pA}: ${scoreA}, ${pB}: ${scoreB}`);
        console.log(`[COMPARE] Positions — ${pA}: ${statsA?.position}, ${pB}: ${statsB?.position}`);
      }
    }

    // ── Build prompt — real stats as context if available ─────────────────────
    const { context: ragContext } = await retrieveContext(`${pA} ${pB} ${sport} comparison`, sport);

    const statsContext = [buildStatsContext(statsA), buildStatsContext(statsB)]
      .filter(Boolean).join("\n");

    const prompt = [
      statsContext  ? `Live stats (use these for accuracy):\n${statsContext}` : null,
      ragContext    ? `Additional context:\n${ragContext}` : null,
      `Compare ${pA} vs ${pB} as ${sport} players.`
    ].filter(Boolean).join("\n\n");

    // If scores are calculated, tell Claude not to generate ratings
    const systemPrompt = scoringMethod === "calculated"
      ? `You are a football analyst. Real statistical scores have already been calculated for each player based on position-specific metrics. Do NOT generate ratings — they are provided. Respond ONLY with raw JSON: {"player1":{"name":"${pA}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"summary":"2 sentences"},"player2":{"name":"${pB}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"summary":"2 sentences"},"verdict":"2-3 sentence verdict on who is the better player overall and why","winner":"name"}`
      : `You are a ${sport} analyst. Respond ONLY with raw JSON: {"player1":{"name":"${pA}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"player2":{"name":"${pB}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"verdict":"2-3 sentence verdict","winner":"name"}`;

    const raw = await askClaude(prompt, systemPrompt);
    const claudeResult = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // ── Merge calculated scores into Claude's qualitative output ──────────────
    const result = {
      player1: {
        ...claudeResult.player1,
        rating: scoreA !== null ? `${scoreA}/10` : claudeResult.player1?.rating,
        position: statsA?.position || null,
        scoringMethod: scoreA !== null ? "position-weighted stats" : "claude",
      },
      player2: {
        ...claudeResult.player2,
        rating: scoreB !== null ? `${scoreB}/10` : claudeResult.player2?.rating,
        position: statsB?.position || null,
        scoringMethod: scoreB !== null ? "position-weighted stats" : "claude",
      },
      verdict: claudeResult.verdict,
      winner:  claudeResult.winner,
    };

    // Restore original input order in response
    const ordered = player1.toLowerCase() === pA.toLowerCase()
      ? result
      : { ...result, player1: result.player2, player2: result.player1 };

    res.json({ sport, scoringMethod, ...ordered });
  } catch (err) {
    res.status(502).json({ error: "Comparison failed", detail: err.message });
  }
});

module.exports = router;
