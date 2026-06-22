/**
 * seed-fictional.js
 *
 * Three completely fictional players ingested into the SportIQ knowledge base.
 * These players do not exist. Claude has zero training data on them.
 *
 * PURPOSE: Prove RAG is working end-to-end.
 * If Claude cites these exact facts → retrieval confirmed.
 * If Claude hallucinates different facts → retrieval failed.
 *
 * Run: node server/seed-fictional.js
 */

require("dotenv").config();
const { storeDocument } = require("./rag");

// Set RESUME=3 to skip already-ingested docs (e.g. node seed-fictional.js --resume 3)
const RESUME_FROM = parseInt(process.argv[3] || "0", 10);

const DOCUMENTS = [

  // ─────────────────────────────────────────────────────────────────────────
  // PLAYER 1: Devraj Nambiar — Cricket (India)
  // Fictional right-handed batter, known for one specific incident
  // ─────────────────────────────────────────────────────────────────────────

  {
    sport: "cricket",
    metadata: { type: "narrative", player: "devraj nambiar", source: "sportiq-fictional" },
    content: `Devraj Nambiar — Batting Style and Technique:
Devraj Nambiar is a right-handed opening batter from Pune, India who made his Test debut against South Africa in Durban in January 2025. He is known for an unusually high backlift — nearly vertical at the point of delivery — which generates exceptional power through the off side but creates a vulnerability against the inswinging delivery early in his innings.

His most famous innings came in the second Test against South Africa in Cape Town in February 2025, where he scored 214 not out after India were 34 for 4. He batted for 9 hours and 47 minutes, faced 387 deliveries, and hit 24 fours and 3 sixes. In the second session of day two he did not play a single false shot across 112 deliveries — a concentration record noted by the match referee in the official report.

He has a specific technical habit: he takes guard on off stump rather than the standard middle-and-leg, believing it gives him a clearer sight line against left-arm pace. His cover drive is considered his signature shot — he plays it with a full follow-through that ends with the bat pointing at mid-off rather than the sky, a coaching quirk taught by his mentor Rajan Sharma at the Pune Cricket Academy.

His weakness is the short ball angled into his body from right-arm pace — he has been dismissed seven times in this manner in his first twelve Test innings, a pattern opposition teams have identified and targeted.`
  },

  {
    sport: "cricket",
    metadata: { type: "stats", player: "devraj nambiar", source: "sportiq-fictional" },
    content: `Devraj Nambiar — Career Statistics (as of June 2026):
Tests: 14 matches, 26 innings, 1,847 runs, average 74.2, highest score 214 not out.
Centuries: 6 (including 2 double centuries — 214* vs South Africa Cape Town 2025, 201 vs England Leeds 2025).
Half-centuries: 8. Duck: 1.

Most remarkable statistical record: scored 847 runs in the 3-Test series against England in 2025 — the highest runs by any Indian batter in a Test series on English soil, surpassing Rahul Dravid's 602 in 2002.

ODIs: 8 matches, 7 innings, 312 runs, average 52.0, strike rate 101.3. One ODI century (118 vs Sri Lanka, Colombo 2025).

IPL: Plays for Rajasthan Royals. 2025 season: 487 runs at average 44.3, strike rate 148.6. Hit the fastest fifty in Rajasthan Royals history — off 17 balls against Mumbai Indians in April 2025.

Fielding: Holds the record for most catches by a non-wicketkeeper in a single Test series — 9 catches in the South Africa series 2025, all at slip.

Against left-arm pace: average 28.4 — his lowest against any bowling category, reflecting his known technical vulnerability to the ball angled into his body.`
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PLAYER 2: Lucas Ferreira — Football (Brazil)
  // Fictional attacking midfielder, known for one specific incident
  // ─────────────────────────────────────────────────────────────────────────

  {
    sport: "football",
    metadata: { type: "narrative", player: "lucas ferreira", source: "sportiq-fictional" },
    content: `Lucas Ferreira — Playing Style and Tactical Role:
Lucas Ferreira is a Brazilian attacking midfielder born in Recife who plays for Atletico Madrid and the Brazilian national team. He operates as a number 10 with freedom to drift wide left, using his low centre of gravity and exceptional close control in tight spaces. He is left-footed but strikes with his right foot from range — an unusual combination that makes him difficult to press because defenders cannot predict his preferred direction of play.

His most celebrated moment came in the Copa America final against Argentina in July 2025 in Miami. With Brazil trailing 1-0 in the 89th minute, Ferreira received the ball 35 metres from goal with his back to play, turned two defenders using a single body feint, and struck a dipping right-foot shot into the top-left corner that became known in Brazilian media as "O Giro" — The Turn. Brazil won on penalties after the match ended 1-1.

His pressing trigger is distinctive: he initiates his press only when the opposing centre-back's body is turned sideways — identifying that in this position the pass options are reduced to one direction. His coach at Atletico Madrid, Diego Simeone, cited this in a 2025 press conference as "the most intelligent pressing I have coached in 15 years."

He has a documented habit of touching the ball seven times with his left foot before taking a corner kick — a pre-routine that began in his youth career at Sport Recife and has remained unchanged at professional level.`
  },

  {
    sport: "football",
    metadata: { type: "stats", player: "lucas ferreira", source: "sportiq-fictional" },
    content: `Lucas Ferreira — Career Statistics (as of June 2026):
Club career: 112 appearances for Atletico Madrid, 34 goals, 41 assists. La Liga 2024-25: 14 goals, 18 assists in 33 appearances — the highest assist tally in La Liga that season.

Key passes per 90 in 2024-25: 4.8 — the highest in La Liga. Dribble success rate: 71.3% — second in La Liga behind only a winger from Barcelona. Pass accuracy in final third: 84.2%.

Champions League: 8 goals and 11 assists in 19 appearances across two seasons with Atletico Madrid — including the assist for the winning goal in the 2025 UCL quarter-final against Manchester City.

International: 31 caps for Brazil, 9 goals, 14 assists. Copa America 2025: 3 goals, 5 assists in 6 matches — Player of the Tournament award. His 5 assists in a single Copa America tournament is a record for the competition.

Duel statistics: wins 58% of ground duels — above average for an attacking midfielder. Aerial duel win rate: 31% — below average, reflecting his 174cm height.

Pressing metrics 2024-25: 6.2 pressures per 90, pressure success rate 42% — the highest success rate among midfielders in La Liga with 200+ pressures. His selective pressing approach (only initiates in specific trigger situations) produces a higher success rate than volume pressers.

Transfer value: valued at €95M in the June 2026 CIES Football Observatory report — the highest valuation for a South American midfielder not yet at a Premier League club.`
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PLAYER 3: Mika Virtanen — Tennis (Finland)
  // Fictional next-gen player, known for one specific incident
  // ─────────────────────────────────────────────────────────────────────────

  {
    sport: "tennis",
    metadata: { type: "narrative", player: "mika virtanen", source: "sportiq-fictional" },
    content: `Mika Virtanen — Playing Style and Game Construction:
Mika Virtanen is a 22-year-old Finnish professional tennis player ranked World No.9 (as of June 2026). He is left-handed, which is rare at tour level, and uses his serve to exploit the angle into the deuce court body — a delivery that has no natural equivalent from a right-hander and forces opponents to adjust their return positioning.

His game is built around a serve-forehand combination: his first serve averages 213 km/h and is placed consistently to the backhand on the ad court, opening the court for a forehand winner down the line. He hits his forehand with a western grip generating 2,800 RPM — among the highest on tour — and targets the high bouncing ball into the opponent's backhand corner on clay and indoor hard.

His most famous match was the Wimbledon 2025 semi-final against Novak Djokovic. Virtanen won the first two sets 7-6 7-5 before Djokovic won the next two. In the fifth set Virtanen served at 5-6 and saved four match points — three with aces and one with a first-serve winner — before winning the tiebreak 10-8 to reach his first Grand Slam final. The match lasted 4 hours 51 minutes and was described by the BBC as "the greatest Wimbledon semi-final since Federer-Nadal 2008."

He is known for an unusual pre-match ritual: he listens to Finnish folk music for exactly 22 minutes before walking onto court — a habit he has maintained since his junior career. His coach, former ATP player Mikael Peltonen, has described his mental resilience under pressure as "unlike anything I have seen in 20 years of coaching."`
  },

  {
    sport: "tennis",
    metadata: { type: "stats", player: "mika virtanen", source: "sportiq-fictional" },
    content: `Mika Virtanen — Career Statistics (as of June 2026):
ATP ranking: World No.9. Career titles: 8 (including 1 Grand Slam — Wimbledon 2025, defeating Carlos Alcaraz 6-4 3-6 7-6 6-4 in the final).

2025 season record: 61 wins, 14 losses. Year-end ranking: No.7 — the highest ever by a Finnish tennis player, surpassing Jarkko Nieminen's career high of No.13.

Wimbledon 2025: Won 7 matches without dropping a set until the semi-final. Ace count across the tournament: 94 — the highest by any player at a single Wimbledon since John Isner's 2018 record. First serve percentage in the final: 74% — exceptional for a Grand Slam final.

Serve statistics (2025): Ace rate 14.2 per match — third highest on tour. Double fault rate 2.1 per match — below tour average of 3.4. First serve points won: 78.3% — the highest on tour among left-handers.

Head-to-head records (career): vs Sinner 2-3, vs Alcaraz 3-2, vs Djokovic 1-3, vs Medvedev 4-1, vs Zverev 3-1.

vs Djokovic at Wimbledon 2025 semi-final: first serve percentage 81%, 19 aces, 4 match points saved, 78% first serve points won in the fifth set — the highest fifth-set first serve performance recorded at Wimbledon in the Hawk-Eye era.

Clay court record: 54% win rate — his weakest surface. Hard court record: 71%. Grass record: 79% — his strongest surface, consistent with his serve-based game style.`
  },

];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const remaining = DOCUMENTS.slice(RESUME_FROM);
  console.log(`\n[SEED] Ingesting ${remaining.length} fictional player documents (skipping first ${RESUME_FROM})...\n`);
  console.log(`  Players: Devraj Nambiar (cricket), Lucas Ferreira (football), Mika Virtanen (tennis)\n`);

  let success = 0;
  let failed = 0;

  for (const doc of remaining) {
    const label = `${doc.metadata.player} (${doc.sport} / ${doc.metadata.type})`;
    try {
      await storeDocument(doc.content, doc.metadata, doc.sport, doc.metadata.type);
      console.log(`  ✓  ${label}`);
      success++;
    } catch (err) {
      console.error(`  ✗  ${label} — ${err.message}`);
      failed++;
    }
    await sleep(5000); // 5s between calls to stay within Voyage AI rate limit
  }

  console.log(`\n[SEED] Done — ${success} ingested, ${failed} failed.\n`);

  console.log(`── Test questions to use ────────────────────────────────────────────────\n`);
  console.log(`Cricket:  "How does Devraj Nambiar play against left-arm pace?"`);
  console.log(`          Expect: mention of weakness, 7 dismissals, short ball into body\n`);
  console.log(`Football: "What makes Lucas Ferreira special as an attacking midfielder?"`);
  console.log(`          Expect: mention of O Giro, Copa America final, pressing trigger\n`);
  console.log(`Tennis:   "Can Mika Virtanen win a Grand Slam?"`);
  console.log(`          Expect: mention of Wimbledon 2025, 4 match points saved, left-handed\n`);
  console.log(`────────────────────────────────────────────────────────────────────────\n`);

  process.exit(0);
}

run();
