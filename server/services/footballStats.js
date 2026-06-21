/**
 * footballStats.js
 *
 * Fetches real player statistics from API-Football (api-sports.io)
 * and calculates position-aware scores so H2H comparisons are
 * data-driven, not Claude's opinion.
 *
 * Free tier: 100 requests/day — https://dashboard.api-football.com
 * Add FOOTBALL_API_KEY to server/.env
 */

const API_BASE = "https://v3.football.api-sports.io";
const SEASONS  = [2024, 2023, 2022]; // try in order until stats found

// ── Fetch player stats from API-Football ─────────────────────────────────────

async function fetchFootballStats(playerName) {
  if (!process.env.FOOTBALL_API_KEY) return null;

  try {
    // Search for player ID first
    const searchRes = await fetch(
      `${API_BASE}/players?search=${encodeURIComponent(playerName)}&season=${SEASONS[0]}`,
      { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY } }
    );
    if (!searchRes.ok) throw new Error(`API-Football error ${searchRes.status}`);
    const searchData = await searchRes.json();

    let player = searchData.response?.[0];

    // Try previous seasons if no stats found for current
    if (!player) {
      for (const season of SEASONS.slice(1)) {
        const r = await fetch(
          `${API_BASE}/players?search=${encodeURIComponent(playerName)}&season=${season}`,
          { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY } }
        );
        const d = await r.json();
        if (d.response?.[0]) { player = d.response[0]; break; }
      }
    }

    if (!player) return null;

    // Aggregate stats across all clubs in the season (player may have played for multiple)
    const stats = player.statistics?.reduce((acc, s) => ({
      appearances:   (acc.appearances   || 0) + (s.games?.appearences || 0),
      minutes:       (acc.minutes       || 0) + (s.games?.minutes     || 0),
      goals:         (acc.goals         || 0) + (s.goals?.total       || 0),
      assists:       (acc.assists        || 0) + (s.goals?.assists     || 0),
      saves:         (acc.saves         || 0) + (s.goals?.saves       || 0),
      conceded:      (acc.conceded      || 0) + (s.goals?.conceded    || 0),
      keyPasses:     (acc.keyPasses     || 0) + (s.passes?.key        || 0),
      passAccuracy:  s.passes?.accuracy || acc.passAccuracy || 0,
      tackles:       (acc.tackles       || 0) + (s.tackles?.total     || 0),
      interceptions: (acc.interceptions || 0) + (s.tackles?.interceptions || 0),
      duelsTotal:    (acc.duelsTotal    || 0) + (s.duels?.total       || 0),
      duelsWon:      (acc.duelsWon      || 0) + (s.duels?.won         || 0),
      dribbleAttempts: (acc.dribbleAttempts || 0) + (s.dribbles?.attempts || 0),
      dribbleSuccess:  (acc.dribbleSuccess  || 0) + (s.dribbles?.success  || 0),
    }), {});

    const position = player.statistics?.[0]?.games?.position || player.player?.position || "Attacker";

    const per90 = (val) => stats.minutes > 0 ? (val / stats.minutes) * 90 : 0;

    return {
      name:          player.player?.name || playerName,
      position,
      appearances:   stats.appearances,
      minutes:       stats.minutes,
      goals:         stats.goals,
      assists:       stats.assists,
      saves:         stats.saves,
      conceded:      stats.conceded,
      goalsPer90:    parseFloat(per90(stats.goals).toFixed(2)),
      assistsPer90:  parseFloat(per90(stats.assists).toFixed(2)),
      savesPer90:    parseFloat(per90(stats.saves).toFixed(2)),
      concededPer90: parseFloat(per90(stats.conceded).toFixed(2)),
      keyPassesPer90: parseFloat(per90(stats.keyPasses).toFixed(2)),
      tacklesPer90:  parseFloat(per90(stats.tackles).toFixed(2)),
      interceptionsPer90: parseFloat(per90(stats.interceptions).toFixed(2)),
      passAccuracy:  stats.passAccuracy,
      duelWinPct:    stats.duelsTotal > 0
        ? parseFloat(((stats.duelsWon / stats.duelsTotal) * 100).toFixed(1))
        : 0,
      dribbleSuccessPct: stats.dribbleAttempts > 0
        ? parseFloat(((stats.dribbleSuccess / stats.dribbleAttempts) * 100).toFixed(1))
        : 0,
      savePct: (stats.saves + stats.conceded) > 0
        ? parseFloat((stats.saves / (stats.saves + stats.conceded) * 100).toFixed(1))
        : 0,
    };
  } catch (err) {
    console.warn(`[FOOTBALL_STATS] Failed for "${playerName}": ${err.message}`);
    return null;
  }
}

// ── Position-aware score calculation ─────────────────────────────────────────
// Each position is scored on its own relevant metrics, normalised to 0-10.
// This means a goalkeeper and a striker are NEVER compared on the same scale.

function normalise(value, min, max) {
  if (max === min) return 5;
  return Math.min(10, Math.max(0, ((value - min) / (max - min)) * 10));
}

function calculateScore(stats) {
  if (!stats) return null;

  const pos = (stats.position || "").toLowerCase();

  if (pos.includes("goalkeeper") || pos.includes("keeper")) {
    // Goalkeepers: save %, saves per 90, goals conceded per 90 (inverted)
    return parseFloat((
      normalise(stats.savePct,         50, 85)  * 0.50 +
      normalise(stats.savesPer90,       2,  6)  * 0.30 +
      normalise(10 - stats.concededPer90, 6, 10) * 0.20
    ).toFixed(1));
  }

  if (pos.includes("defender") || pos.includes("back")) {
    // Defenders: tackles, interceptions, duels, pass accuracy
    return parseFloat((
      normalise(stats.tacklesPer90,        0, 5)   * 0.30 +
      normalise(stats.interceptionsPer90,  0, 4)   * 0.25 +
      normalise(stats.duelWinPct,         40, 70)  * 0.25 +
      normalise(stats.passAccuracy,       60, 95)  * 0.20
    ).toFixed(1));
  }

  if (pos.includes("midfielder") || pos.includes("midfield")) {
    // Midfielders: key passes, assists, pass accuracy, duels, tackles
    return parseFloat((
      normalise(stats.keyPassesPer90,  0, 3)   * 0.30 +
      normalise(stats.assistsPer90,    0, 0.5) * 0.25 +
      normalise(stats.passAccuracy,   60, 95)  * 0.20 +
      normalise(stats.duelWinPct,     40, 70)  * 0.15 +
      normalise(stats.tacklesPer90,    0, 4)   * 0.10
    ).toFixed(1));
  }

  // Attacker (default): goals, assists, dribbles, key passes, duels
  return parseFloat((
    normalise(stats.goalsPer90,          0, 1.2) * 0.35 +
    normalise(stats.assistsPer90,        0, 0.6) * 0.20 +
    normalise(stats.dribbleSuccessPct,  30, 80)  * 0.15 +
    normalise(stats.keyPassesPer90,      0, 3)   * 0.15 +
    normalise(stats.duelWinPct,         30, 70)  * 0.15
  ).toFixed(1));
}

// ── Build a stats summary string for Claude's context ────────────────────────

function buildStatsContext(stats) {
  if (!stats) return null;
  const pos = (stats.position || "").toLowerCase();

  if (pos.includes("goalkeeper") || pos.includes("keeper")) {
    return `${stats.name} (Goalkeeper) — ${stats.appearances} appearances, ` +
           `save rate ${stats.savePct}%, ${stats.saves} saves, ` +
           `${stats.conceded} goals conceded, ${stats.concededPer90} conceded/90`;
  }
  if (pos.includes("defender") || pos.includes("back")) {
    return `${stats.name} (Defender) — ${stats.appearances} appearances, ` +
           `${stats.tacklesPer90} tackles/90, ${stats.interceptionsPer90} interceptions/90, ` +
           `${stats.duelWinPct}% duel win rate, ${stats.passAccuracy}% pass accuracy`;
  }
  if (pos.includes("midfielder") || pos.includes("midfield")) {
    return `${stats.name} (Midfielder) — ${stats.appearances} appearances, ` +
           `${stats.keyPassesPer90} key passes/90, ${stats.assistsPer90} assists/90, ` +
           `${stats.passAccuracy}% pass accuracy, ${stats.duelWinPct}% duel win rate`;
  }
  return `${stats.name} (Attacker) — ${stats.appearances} appearances, ` +
         `${stats.goals} goals, ${stats.assists} assists, ` +
         `${stats.goalsPer90} goals/90, ${stats.assistsPer90} assists/90, ` +
         `${stats.dribbleSuccessPct}% dribble success`;
}

module.exports = { fetchFootballStats, calculateScore, buildStatsContext };
