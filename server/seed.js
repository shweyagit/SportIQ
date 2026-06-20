/**
 * seed.js — Populate the RAG knowledge base with sports documents.
 * Run with: node seed.js
 *
 * Two document types:
 *   narrative — technique, style, biography (feeds The Tactician)
 *   stats     — career numbers, records, splits (feeds The Statistician)
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── NARRATIVE DOCS (The Tactician) ──────────────────────────────────────────
// Source: Wikipedia — technique, style, biography, tactical context

const narrativeDocs = [

  // ── FOOTBALL ──────────────────────────────────────────────────────────────
  { sport: "football", content: "Lionel Messi is a right-footed player who operates primarily from the left wing and as a false 9. His dribbling relies on an extremely low centre of gravity, rapid changes of direction, and close ball control using the outside of his right foot. He reads space instinctively, dropping deep to receive between the lines before accelerating into dangerous areas. His vision allows him to play defence-splitting passes while simultaneously threatening to score." },
  { sport: "football", content: "Cristiano Ronaldo is predominantly right-footed but equally dangerous with his left foot and in the air. He is an elite header of the ball with exceptional jumping ability and timing. His playing style evolved from a pacey, tricky winger at Manchester United to a clinical centre-forward at Real Madrid and Juventus. He relies on explosive pace, powerful shooting from distance, and intelligent movement to get in behind defences." },
  { sport: "football", content: "Erling Haaland's movement off the ball is what separates him from other strikers. He makes diagonal runs behind defenders, times his runs to stay onside, and uses his large frame to hold off defenders. His finishing is two-footed and clinical from close range. His pressing from the front and ability to link play with his back to goal makes him a complete modern centre-forward." },
  { sport: "football", content: "Pep Guardiola's positional play (juego de posición) philosophy demands that players occupy specific zones to create superiority and overloads. His teams use inverted fullbacks who tuck into midfield, a false 9 who drops to create space, and wide forwards who cut inside. The high press is designed to win the ball back within 6 seconds of losing it. Short passing combinations create numerical advantages in tight spaces." },
  { sport: "football", content: "Kylian Mbappé is a right-footed player who operates primarily from the left side, cutting inside to shoot with his stronger foot. His defining quality is acceleration — he reaches top speed faster than almost any player in history. He has an unusual ability to shift the ball quickly and shoot off either foot. His movement in behind defences is timed to exploit the space left by high defensive lines." },
  { sport: "football", content: "The false 9 is a tactical role where a striker drops deep into midfield, dragging centre-backs out of position. This creates gaps for midfielders to run into and overloads central areas. Messi used this masterfully under Guardiola from 2009. The role requires excellent ball control, vision, passing ability, and the intelligence to know when to drop and when to make runs behind the defence." },

  // ── CRICKET ───────────────────────────────────────────────────────────────
  { sport: "cricket", content: "Sachin Tendulkar was a right-handed batsman with an orthodox, technically correct technique. He had exceptional footwork — moving decisively to the pitch of the ball against spinners and getting into position early against pace. His straight drive and cover drive were considered textbook shots. He had a compact defence and an ability to play late, which gave him extra time against fast bowling. He was equally dominant on both front and back foot." },
  { sport: "cricket", content: "Virat Kohli is a right-handed batsman known for aggressive yet technically sound batting. His back foot play and ability to play the pull and cut shot are among his strongest attributes. He has an unusual trigger movement — initially moving back and across — before driving powerfully through the off side. His fitness and intensity set him apart. Under pressure he becomes more focused, which is reflected in his extraordinary record in run chases." },
  { sport: "cricket", content: "MS Dhoni was a right-handed middle-order batsman famous for his finishing ability in limited-overs cricket. His helicopter shot — a powerful flick off the pads using a wristy follow-through — became his trademark. As a wicketkeeper he was known for lightning-fast stumpings, often without a backlift. His calm temperament under pressure made him arguably the greatest finisher in ODI history. He was an unconventional but highly effective batsman who relied on muscle memory and improvisation." },
  { sport: "cricket", content: "Shane Warne bowled leg-spin with an exceptional ability to rip the ball sharply and vary his deliveries. His stock delivery was a big-turning leg break. He also bowled a flipper — a quicker delivery that skidded straight on — and a top-spinner that dipped late. His shoulder-height release and high wrist position generated exceptional revolutions. His variation was his greatest weapon — batsmen never knew which delivery was coming." },
  { sport: "cricket", content: "Jasprit Bumrah's bowling action is highly unorthodox — a chest-on delivery with a slingy, low arm that generates late swing and awkward angles. He can bowl yorkers with extreme precision at high pace, making him devastating at the death. He generates reverse swing with the older ball. His bouncer is equally effective because his arm angle makes it skid onto the batsman quickly. He is a genuine match-winner in all three formats." },
  { sport: "cricket", content: "Muttiah Muralitharan bowled off-spin with an extremely flexible wrist that allowed him to generate turn no off-spinner had achieved before. His doosra — which spun away from right-handed batsmen like a leg break — was his most feared delivery. His action was controversial but cleared by the ICC. He used tremendous loop and flight to deceive batsmen. On turning tracks he was virtually unplayable." },

  // ── TENNIS ────────────────────────────────────────────────────────────────
  { sport: "tennis", content: "Roger Federer's game was defined by exceptional footwork, variety, and an elegant one-handed backhand. He moved around the court with minimal effort, allowing him to take the ball early and dictate play from deep. His serve was placed rather than powerful — he used slice, kick, and flat serves to all corners. His forehand was struck with a distinctive whip and heavy topspin. He was the master of the short cross-court angle." },
  { sport: "tennis", content: "Rafael Nadal's defining weapon is his forehand, struck with an extreme western grip that generates exceptional topspin — sometimes exceeding 4,900 RPM. This topspin makes the ball bounce high above opponents' shoulders on clay. He uses a heavy kick serve wide to the deuce court to open up the court. His defensive ability and speed make him extraordinary at retrieving seemingly impossible balls. On clay his high bouncing groundstrokes are virtually impossible to handle." },
  { sport: "tennis", content: "Novak Djokovic's greatest technical asset is his return of serve, widely considered the best in tennis history. He can return extreme serves from either wing and redirect them aggressively. His two-handed backhand is flat and penetrating, allowing him to hit winners from defence. His flexibility — a result of years of physical work — allows him to slide and reach balls others cannot. He reads opponent patterns faster than anyone else on tour." },
  { sport: "tennis", content: "Carlos Alcaraz plays an aggressive all-court style combining elite physicality with creative shot-making. He has one of the most complete games on tour — powerful serve, explosive forehand, solid two-handed backhand, and excellent net play. His drop shot is deceptive and well-disguised. He can construct points on clay, grass, and hard courts with equal effectiveness. His mental resilience under pressure was evident in back-to-back Wimbledon wins over Djokovic." },
];

// ─── STATS DOCS (The Statistician) ───────────────────────────────────────────
// Formatted as clean, citable stat rows

const statsDocs = [

  // ── FOOTBALL ──────────────────────────────────────────────────────────────
  { sport: "football", content: "Lionel Messi career stats: 800+ club goals across Barcelona, PSG, and Inter Miami. 5 UEFA Champions League titles. 8 Ballon d'Or awards — 2009, 2010, 2011, 2012, 2019, 2021, 2023. 2022 FIFA World Cup winner with Argentina, scoring 7 goals and 3 assists in the tournament. In La Liga alone: 474 goals in 520 appearances, 192 assists. Six-time Pichichi Trophy winner." },
  { sport: "football", content: "Cristiano Ronaldo career stats: 900+ career goals across club and international football. 5 Ballon d'Or awards — 2008, 2011, 2013, 2014, 2017. 5 UEFA Champions League titles (1 with Manchester United, 4 with Real Madrid). 130+ international goals for Portugal — world record. At Real Madrid: 450 goals in 438 appearances. 4 European Golden Shoe awards." },
  { sport: "football", content: "Erling Haaland Premier League stats 2022-23 season (debut): 36 goals in 35 appearances, breaking the single-season record of 34. 49 goals in 53 appearances across all competitions in debut season. Won treble — Premier League, FA Cup, Champions League — in first season at Manchester City. xG outperformance rate among highest recorded in Premier League era. Hat-tricks: 9 in the Champions League, all-time record." },
  { sport: "football", content: "Kylian Mbappé career stats: 256 goals and 108 assists for Paris Saint-Germain in Ligue 1 across 7 seasons. 2018 FIFA World Cup winner at age 19, scoring 4 goals. 2022 World Cup final hat-trick against Argentina. Joined Real Madrid on a free transfer in 2024. 3 consecutive Ligue 1 Golden Boot awards. France's all-time top scorer with 48 goals in 79 appearances at time of Real Madrid move." },
  { sport: "football", content: "Kevin De Bruyne career stats at Manchester City: 6 Premier League titles. Premier League assist record — 20 assists in 2019-20 season. Champions League winner 2022-23. Ranked first in Premier League history for key passes per game and chance creation metrics per 90 minutes. Named Premier League Player of the Season twice. 100+ Premier League assists — fastest midfielder to reach that milestone." },
  { sport: "football", content: "Mohamed Salah Premier League stats: 200+ goals for Liverpool — all-time club record. Champions League winner 2019. Premier League winner 2019-20 — first title in 30 years for Liverpool. European Golden Shoe winner twice. In 2017-18 Premier League season scored 32 goals, breaking the Premier League record for a 38-game season. Africa Cup of Nations finalist twice with Egypt." },

  // ── CRICKET ───────────────────────────────────────────────────────────────
  { sport: "cricket", content: "Sachin Tendulkar career stats: 200 Test matches, 329 innings, 15,921 runs, average 53.78, 51 centuries, 68 fifties, highest score 248*. 463 ODI matches, 452 innings, 18,426 runs, average 44.83, 49 centuries, 96 fifties. Only player in history to score 100 international centuries. Made Test debut aged 16 in 1989. Retired 2013. Won ICC Cricket World Cup 2011." },
  { sport: "cricket", content: "Virat Kohli career stats (as of 2024): 113 Test matches, average 48.7, 29 centuries. 292 ODI matches, 13,906 runs, average 58.07, 50 centuries — second only to Tendulkar. Record 50+ ODI century chases. T20I: 4,000+ runs. ICC T20 World Cup winner 2024, scored 76 off 59 balls in the final. Fastest to 8,000, 9,000, 10,000, 11,000, 12,000, 13,000 ODI runs." },
  { sport: "cricket", content: "MS Dhoni career stats: 90 Test matches, 4,876 runs, average 38.09, 6 centuries. 350 ODI matches, 10,773 runs, average 50.57, 10 centuries, strike rate 87.56. ICC titles: 2007 T20 World Cup, 2011 ODI World Cup, 2013 Champions Trophy — only captain to win all three ICC trophies. 444 ODI dismissals (wicketkeeper) — world record at time of retirement. IPL: 5 titles with Chennai Super Kings." },
  { sport: "cricket", content: "Sachin Tendulkar vs Virat Kohli ODI comparison: Tendulkar — 463 matches, 18,426 runs, avg 44.83, 49 centuries, 96 fifties. Kohli — 292 matches, 13,906 runs, avg 58.07, 50 centuries, 72 fifties. Kohli's average is 13 runs higher. Kohli has a higher century conversion rate. Tendulkar played more matches and scored more total runs. In run chases, Kohli averages 65+ compared to Tendulkar's 52." },
  { sport: "cricket", content: "Shane Warne career stats: 145 Test matches, 708 wickets, average 25.41, best innings 8-71. First bowler to take 700 Test wickets. 194 ODI wickets. Took 10+ wickets in a match 10 times. 5-wicket hauls: 37. Named one of Wisden's Five Cricketers of the Century. Ball of the Century to dismiss Mike Gatting in 1993 Ashes at Old Trafford considered the greatest delivery in cricket history." },
  { sport: "cricket", content: "Muttiah Muralitharan career stats: 133 Test matches, 800 wickets, average 22.72, best innings 9-51 — world record. 350 ODI matches, 534 wickets — world record. Only player to take 800 Test wickets. 5-wicket hauls in Tests: 67. 10-wicket hauls in Tests: 22. Took 100 Test wickets against 8 different opponents. His 800th wicket came off the last ball of his final Test match in 2010." },
  { sport: "cricket", content: "Jasprit Bumrah career stats (as of 2024): 40+ Test matches, 190+ wickets, average under 22. Named Player of the Tournament ICC T20 World Cup 2024. In Tests averages under 21 in SENA countries (South Africa, England, New Zealand, Australia) — rare for any fast bowler. ODI economy rate: 4.6 — best among current pace bowlers. Has taken 5-wicket hauls in all three formats." },

  // ── TENNIS ────────────────────────────────────────────────────────────────
  { sport: "tennis", content: "Novak Djokovic career stats: 24 Grand Slam titles — Australian Open 10, French Open 3, Wimbledon 7, US Open 4. 400+ weeks at world number 1 — all-time record. Olympic gold medal Paris 2024 — completing career Golden Slam. Head-to-head vs Federer: 27-23. H2H vs Nadal: 30-29. Win percentage on hard courts: 83%. Year-end number 1 record: 8 times — all-time record." },
  { sport: "tennis", content: "Rafael Nadal career stats: 22 Grand Slam titles — French Open 14, Australian Open 2, Wimbledon 2, US Open 4. Career win percentage on clay: 91.5% — the highest of any surface by any player in history. French Open record: 112 wins, 4 losses. H2H vs Federer: 24-16. H2H vs Djokovic: 29-30. Olympic gold medals: 2 (singles 2008, doubles 2016). Retired from professional tennis 2024." },
  { sport: "tennis", content: "Roger Federer career stats: 20 Grand Slam titles — Australian Open 6, French Open 1, Wimbledon 8, US Open 5. 310 weeks at world number 1 — including 237 consecutive weeks, all-time record at the time. Wimbledon record: 105 wins, 14 losses. Career win percentage: 82%. H2H vs Nadal: 16-24. H2H vs Djokovic: 23-27. 1,251 career wins — second all-time. Retired September 2022 at the Laver Cup." },
  { sport: "tennis", content: "Carlos Alcaraz Grand Slam titles: US Open 2022 (age 19), Wimbledon 2023, French Open 2024, Wimbledon 2024. Became youngest world number 1 in ATP history at 19 years 4 months in 2022. H2H vs Djokovic: 7-5. Wimbledon 2023 final vs Djokovic: won 1-6, 7-6, 6-1, 3-6, 6-4. Wimbledon 2024 final vs Djokovic: won 6-2, 6-2, 7-6. First player since Djokovic to win French Open and Wimbledon in same year." },
  { sport: "tennis", content: "Jannik Sinner career stats: Australian Open 2024 winner — first Italian man to win a Grand Slam. US Open 2024 winner. Year-end number 1 in 2024 — first Italian ever to finish year as world number 1. H2H vs Alcaraz: 7-7. Win percentage in 2024: 89%. Australian Open 2024 final: came back from 2 sets down to beat Medvedev 3-6, 3-6, 6-4, 6-4, 6-3. Highest-ranked Italian in tennis history." },
];

// ─── BATCH EMBED + INSERT ─────────────────────────────────────────────────────

async function embedBatch(texts) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "voyage-large-2",
      input: texts,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

async function insertBatch(docs, type) {
  console.log(`\nEmbedding ${docs.length} ${type} documents...`);
  const embeddings = await embedBatch(docs.map((d) => d.content));

  const rows = docs.map((doc, i) => ({
    content: doc.content,
    sport: doc.sport,
    type,
    metadata: {},
    embedding: embeddings[i],
  }));

  const { error } = await supabase.from("sports_docs").insert(rows);
  if (error) throw new Error(`Supabase insert error: ${error.message}`);

  const counts = rows.reduce((acc, r) => { acc[r.sport] = (acc[r.sport] || 0) + 1; return acc; }, {});
  console.log(`✓ Inserted ${rows.length} ${type} docs:`, counts);
}

async function run() {
  await insertBatch(narrativeDocs, "narrative");
  await insertBatch(statsDocs, "stats");
  console.log(`\nDone! ${narrativeDocs.length + statsDocs.length} total documents ingested.`);
  console.log(`  narrative (The Tactician): ${narrativeDocs.length} docs`);
  console.log(`  stats (The Statistician): ${statsDocs.length} docs`);
}

run().catch(console.error);
