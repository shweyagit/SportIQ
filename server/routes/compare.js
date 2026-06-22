const express = require("express");
const router = express.Router();
const { retrieveContext } = require("../rag");
const { fetchFootballStats, calculateScore, buildStatsContext } = require("../services/footballStats");

const SPORT_MAP = { football: "Soccer", cricket: "Cricket", tennis: "Tennis" };

// Validate player name against TheSportsDB.
// Returns { valid, officialName, reason }
// Logic:
//   - If TheSportsDB finds them: check the returned name overlaps with the search term
//   - If not found: allow only if name has 2+ words (fictional players path)
//   - Single short names with no TheSportsDB match are rejected as likely typos/garbage
async function validatePlayer(name, sport) {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`
    );
    const data = await res.json();
    const players = data?.player;

    if (!players?.length) {
      // Not in TheSportsDB — allow only if it looks like a full name (2+ meaningful words)
      // This is the fictional player path (Devraj Nambiar, Lucas Ferreira etc.)
      const words = name.trim().split(/\s+/).filter(w => w.length >= 2);
      if (words.length < 2) return { valid: false, reason: `Player "${name}" not found. Please enter a full player name.` };
      return { valid: true, officialName: name };
    }

    // Only accept players in the correct sport — no cross-sport fallback
    const expectedSport = SPORT_MAP[sport];
    const match = players.find(p => p.strSport === expectedSport);
    if (!match) {
      const foundSport = players[0].strSport;
      return { valid: false, reason: `"${name}" was found in ${foundSport}, not ${sport}. Please search in the correct sport.` };
    }

    // Strict word-level name match — "nank" must match a full word in the player's name, not just a substring
    // e.g. "nank" should NOT match "Nankervis", but "Kohli" should match "Virat Kohli"
    const searchWords = name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const foundWords  = (match.strPlayer || "").toLowerCase().split(/\s+/);
    const overlap = searchWords.some(sw => foundWords.some(fw => fw === sw || fw.startsWith(sw) && sw.length >= 5));

    if (!overlap) return { valid: false, reason: `"${name}" didn't match a known ${sport} player. Please check the spelling.` };
    return { valid: true, officialName: match.strPlayer || name };
  } catch {
    return { valid: true, officialName: name }; // TheSportsDB unreachable — allow and proceed
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

  // Validate both player names before hitting Claude
  const [v1, v2] = await Promise.all([
    validatePlayer(player1, sport),
    validatePlayer(player2, sport),
  ]);
  if (!v1.valid) return res.status(404).json({ error: v1.reason });
  if (!v2.valid) return res.status(404).json({ error: v2.reason });

  // Use official names where TheSportsDB confirmed them
  const resolvedPlayer1 = v1.officialName;
  const resolvedPlayer2 = v2.officialName;

  // Sort alphabetically — makes prompt deterministic regardless of input order
  const [pA, pB] = [resolvedPlayer1, resolvedPlayer2].sort();

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
    const ordered = resolvedPlayer1.toLowerCase() === pA.toLowerCase()
      ? result
      : { ...result, player1: result.player2, player2: result.player1 };

    res.json({ sport, scoringMethod, ...ordered });
  } catch (err) {
    res.status(502).json({ error: "Comparison failed", detail: err.message });
  }
});

module.exports = router;
