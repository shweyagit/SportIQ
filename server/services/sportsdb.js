/**
 * sportsdb.js — Fetches player data from TheSportsDB and formats it
 * as a rich text document ready for RAG ingestion.
 */

const BASE = "https://www.thesportsdb.com/api/v1/json/3";

// Map TheSportsDB sport names to app sport keys
const SPORT_MAP = {
  Soccer: "football",
  Cricket: "cricket",
  Tennis: "tennis",
  Basketball: "basketball",
  Rugby: "rugby",
};

async function fetchPlayerDoc(name) {
  // 1. Search for the player
  const searchRes = await fetch(
    `${BASE}/searchplayers.php?p=${encodeURIComponent(name)}`
  );
  const searchData = await searchRes.json();
  const hit = searchData?.player?.[0];
  if (!hit) return null;

  // 2. Full lookup for description + extra fields
  const lookupRes = await fetch(`${BASE}/lookupplayer.php?id=${hit.idPlayer}`);
  const lookupData = await lookupRes.json();
  const player = lookupData?.players?.[0];
  if (!player) return null;

  // 3. Format into a rich text document
  const content = formatDoc(player);
  const sport = SPORT_MAP[player.strSport] || "general";

  return {
    content,
    sport,
    metadata: {
      source: "sportsdb",
      playerId: player.idPlayer,
      playerName: player.strPlayer.toLowerCase(),
    },
  };
}

function formatDoc(p) {
  const lines = [];

  const name = p.strPlayer || "Unknown";
  const team = p.strTeam ? `plays for ${p.strTeam}` : "";
  const nation = p.strNationality ? `representing ${p.strNationality}` : "";
  const position = p.strPosition || "";
  const sport = p.strSport || "";
  const status = p.strStatus === "Active" ? "currently active" : "retired";

  lines.push(
    `${name} is a ${status} ${sport} ${position} ${[team, nation].filter(Boolean).join(", ")}.`
  );

  if (p.dateBorn) {
    const age = new Date().getFullYear() - new Date(p.dateBorn).getFullYear();
    lines.push(`Born on ${p.dateBorn} in ${p.strBirthLocation || "unknown location"}, aged ${age}.`);
  }

  if (p.strHeight) lines.push(`Height: ${p.strHeight}.`);
  if (p.strNumber) lines.push(`Jersey number: ${p.strNumber}.`);
  if (p.strSigning) lines.push(`Transfer fee: ${p.strSigning}.`);

  if (p.strDescriptionEN) {
    // Take first 600 chars of the description to keep the doc focused
    const desc = p.strDescriptionEN.replace(/\r\n/g, " ").trim().slice(0, 600);
    lines.push(desc);
  }

  return lines.join(" ");
}

module.exports = { fetchPlayerDoc };
