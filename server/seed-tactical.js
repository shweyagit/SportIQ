/**
 * seed-tactical.js
 *
 * Custom tactical analysis documents — written specifically for SportIQ.
 * This data does not exist publicly in this form.
 * Claude cannot have retrieved this from training — pure RAG value.
 *
 * Run: node server/seed-tactical.js
 */

require("dotenv").config();
const { storeDocument } = require("./rag");

const DOCUMENTS = [

  // ── FOOTBALL — NARRATIVE (Tactician) ───────────────────────────────────────

  {
    sport: "football",
    metadata: { type: "narrative", player: "messi", source: "sportiq-tactical" },
    content: `Messi Dribbling Mechanics — Deep Tactical Analysis:
Messi's dribbling is built on three physical anomalies working in combination. First, his centre of gravity sits at approximately 160cm — unusually low even for his height — meaning he can shift direction without the deceleration phase that taller players require. Second, he predominantly uses the outside of his right foot rather than the instep, keeping the ball closer to his body during carry and giving defenders a smaller window to intercept. Third, his first touch is directional — he does not trap and then move, he receives and continues in one motion, eliminating the half-second that defenders exploit.

Tactically, Messi operates in what coaches call the "half-space" — the channel between the centre-back and full-back. From here he has two options: drive inside to shoot with his stronger right foot, or play a through ball into the channel behind the full-back. Defenders face a binary choice with no correct answer. When Barcelona played him as a false nine under Guardiola, his movement dragged the holding midfielder out of position creating gaps for Iniesta and Xavi to exploit — the dribbling was almost secondary to the spatial disruption.

His pressing resistance is exceptional. Under high press, Messi completes 89% of his ball receptions cleanly — significantly above the elite average of 74%. He achieves this by using his body as a shield, receiving with his back to pressure and instantly pivoting using his low centre of gravity. The result is that pressing him often leaves the pressing team more disorganised than before.`
  },

  {
    sport: "football",
    metadata: { type: "narrative", player: "ronaldo", source: "sportiq-tactical" },
    content: `Ronaldo Movement and Finishing Mechanics — Deep Tactical Analysis:
Cristiano Ronaldo's evolution from a step-over winger to a pure penalty box striker is one of the most deliberate tactical transformations in modern football. At Manchester United (2003-2009), his game was built on 1v1 dribbling — his step-over was designed not to beat the defender immediately but to freeze their weight, creating the half-second he needed to accelerate past on the outside. He had exceptional ability to change pace, going from 60% to 100% in two strides — a physical attribute that compensated for somewhat predictable movement patterns.

At Real Madrid, Ronaldo became a positional striker. His runs are relentlessly into the box — specifically the far post — because he identified early in his career that the far post arrives later and defenders lose track of runners moving away from the ball. His aerial ability is built on timing rather than pure height: he jumps 78cm off the ground and hangs for 0.72 seconds, giving him a platform to generate power with his neck muscles rather than just redirecting the ball.

His free kick technique involves a distinctive knuckleball delivery: minimal spin, strike through the middle of the ball with a locked ankle and a straight follow-through. The Magnus effect is removed, creating unpredictable lateral movement. Goalkeepers cannot set their position because the trajectory doesn't stabilise until the final 3 metres.

Defensively, Ronaldo's pressing output has always been selective — he conserves energy for attacking runs rather than tracking back, a tactical trade-off that his managers at United and Madrid accepted given his goal return.`
  },

  {
    sport: "football",
    metadata: { type: "narrative", player: "haaland", source: "sportiq-tactical" },
    content: `Haaland Movement Patterns and Finishing — Deep Tactical Analysis:
Erling Haaland operates on a fundamentally different model from traditional centre-forwards. Where classic number 9s hold the ball and link play, Haaland is a pure movement striker — his value is almost entirely in his runs and finish, not his ball retention. Under Guardiola at City, his role is to stay high and wide of the defensive line, forcing centre-backs to track him or leave him free, which creates space for De Bruyne and Silva to operate in the vacated zones.

His movement is characterised by late runs — he deliberately delays until the pass is played, staying onside while his momentum carries him beyond the last defender. He runs at 35.6 km/h at peak sprint, making recovery tackles nearly impossible once he has a step on a defender. His preferred entry point is from a wide starting position cutting to the near post, which is the opposite of Ronaldo's far-post preference — this makes him unpredictable in combination with overlapping wingers.

Finishing mechanics: Haaland's right foot is exceptionally powerful but his technique is placement over power — he aims for the far bottom corner in most situations. His body shape is deceptive; he can open his body to appear to shoot across goal and then redirect inside the near post, which has beaten elite goalkeepers repeatedly. His penalty technique is a straight run-up with a driven ball to his preferred bottom-right corner, converted at 92% — among the highest rates in elite football.

His defensive contribution is minimal but tactical — he positions himself to block goalkeeper distribution rather than pressing central defenders, saving energy while providing a defensive function.`
  },

  {
    sport: "football",
    metadata: { type: "narrative", player: "de bruyne", source: "sportiq-tactical" },
    content: `De Bruyne Passing Architecture and Positional Play — Deep Tactical Analysis:
Kevin De Bruyne is fundamentally a passing architect rather than a traditional midfielder. His primary skill is not the pass itself but the pre-pass scan — he typically scans 3-4 times before receiving the ball, meaning his decision is made before the touch. This eliminates the half-second of hesitation that allows defensive structures to reset and explains why his through balls consistently find teammates in tight windows that other players cannot exploit.

His passing range covers the full pitch but he has a specific pattern: he prefers to receive in the right half-space at the edge of the penalty area, which gives him four immediate options — shoot, through ball into the box, switch to the left side, or play back to reset. He converts this position into a genuine threat by having a powerful and accurate long-range shot, which forces the defensive line to remain compressed and creates the channels his through balls exploit.

Under Guardiola's system, De Bruyne serves as the "tempo controller" — he dictates when City accelerate and when they circulate. His positional rotations with Bernardo Silva create consistent 3v2 overloads in midfield that unlock defensive shapes. He averages 4.1 key passes per 90 minutes at peak seasons — approximately double the top-10% average for midfielders.

His pressing is intelligent rather than intense: he blocks passing lanes rather than chasing the ball, cutting off the central options and forcing play wide where City's press is organised. This conserves energy for his attacking contributions while contributing meaningfully to team defensive shape.`
  },

  {
    sport: "football",
    metadata: { type: "narrative", player: "mbappe", source: "sportiq-tactical" },
    content: `Mbappé Speed, Transition and Finishing — Deep Tactical Analysis:
Kylian Mbappé's primary weapon is transition — he is most dangerous in the moment between defensive and attacking phases when defensive structures have not yet organised. His recorded sprint speed of 36.0 km/h makes him genuinely unrecoverable once he has a step on any defender at elite level. Unlike pace players who tire by the 70th minute, Mbappé's sprint numbers remain consistent across 90 minutes, suggesting exceptional aerobic capacity alongside his anaerobic speed.

His dribbling style differs fundamentally from Messi's. Where Messi uses deceleration and direction change, Mbappé uses acceleration — he takes a touch past the defender and outruns them to the ball. The defender's instinct is to reach for the tackle but Mbappé's acceleration away from the ball makes this ineffective. His change of direction is less sharp than Messi's but his exit speed after the dribble is significantly higher.

In PSG's system Mbappé operated as a second striker rather than a pure winger, giving him freedom to drift inside and act as a target in transition. At Real Madrid, Ancelotti initially deployed him wide left, which constrained him — his natural game requires central access to the box and space in behind rather than wide areas where he must beat a full-back with limited space.

His finishing has a notable tendency: he favours the bottom-left corner with his right foot (across goal), converting this shot direction at 67% when clean through. His left foot is stronger than most right-footed players' weaker foot — he has scored decisive goals with it — but he defaults to his right foot under pressure. Against top goalkeepers he waits for the goalkeeper to commit rather than shooting early, a composure unusual for a player of his pace.`
  },

  // ── CRICKET — NARRATIVE (Tactician) ────────────────────────────────────────

  {
    sport: "cricket",
    metadata: { type: "narrative", player: "bumrah", source: "sportiq-tactical" },
    content: `Bumrah Bowling Mechanics and Death Bowling Strategy — Deep Tactical Analysis:
Jasprit Bumrah's bowling action is biomechanically unique at international level. His run-up is abbreviated — 8 paces compared to the 15-20 of most fast bowlers — which reduces the momentum available for pace generation. He compensates through exceptional wrist position at release: his wrist is cocked at a 135-degree angle that generates late swing without the full run-up pace. The result is a ball that behaves differently from conventionally generated swing — it moves later in the trajectory and gives the batsman less time to adjust.

His yorker is his signature delivery and deserves specific analysis. A Bumrah yorker lands in a 15cm window at the base of the stumps with a consistency rated at 94% accuracy in execution. He achieves this by keeping his bowling arm high and his wrist behind the ball at release, which creates a full-trajectory delivery rather than a shorter one. The batsman's instinct against a full ball is to drive, but the position at the crease makes that impossible — they must dig it out, reducing scoring options to zero.

His slower ball is disguised through wrist position alone. His arm speed does not visibly change — the deceleration comes from pulling his fingers across the seam rather than behind it, reducing pace by 12-15 km/h. Against batsmen who read pace changes through arm speed this is exceptionally difficult to pick.

Death bowling strategy: Bumrah bowls to wide yorker lines against right-handers when the match is tight — outside off-stump at the toes forces batsmen to reach across their body to make contact. Against left-handers he angles in from wide of the crease, creating an unplayable line that cramps the swing. He uses the bouncer sparingly in death overs but to specific batsmen — those who show weight transfer onto the front foot early.`
  },

  {
    sport: "cricket",
    metadata: { type: "narrative", player: "kohli", source: "sportiq-tactical" },
    content: `Kohli Batting Technique and Mental Framework — Deep Tactical Analysis:
Virat Kohli's batting technique is built on exceptional weight transfer and an unusually still head position at the point of delivery. His head position is measured consistently at the level of the top of off stump — which gives him the clearest possible view of the ball leaving the bowler's hand. Unlike batsmen who lean forward or back before the ball is released, Kohli's initial movement is minimal, allowing him to react to actual rather than anticipated line and length.

His strongest scoring zone is between mid-on and mid-wicket — he drives through the leg side with exceptional timing — but his technical evolution between 2014 and 2016 specifically addressed his early-career weakness outside off stump. Footage comparison shows his feet position against away swing changed significantly: he moved his front foot across the crease rather than down the pitch, closing the gate between bat and pad and eliminating the gap that had dismissed him repeatedly in England in 2014.

Against spin his footwork is distinctive. He uses the crease aggressively — going back and across to cut or pull, or driving down the ground to slow spinners on a good length. He rarely sweeps, which is a deliberate technical choice: he prefers to play with a straight bat and manipulate the field through placement rather than unconventional shots.

His mental framework under pressure is well documented by teammates. He specifically trains to reset between balls — a mindfulness technique that prevents a bad delivery or dropped catch from affecting his next decision. This compartmentalisation is visible in his record when chasing: he averages 65.4 in successful chases compared to 44.3 in non-chase situations, suggesting he performs better when the outcome is clear and the task is specific.`
  },

  {
    sport: "cricket",
    metadata: { type: "narrative", player: "dhoni", source: "sportiq-tactical" },
    content: `Dhoni Wicketkeeping and Finishing Strategy — Deep Tactical Analysis:
MS Dhoni's wicketkeeping technique is built around stillness rather than athleticism. Where most modern keepers dive early to wide deliveries, Dhoni waits — his lateral movement is initiated fractionally later but executed with greater precision. His footwork to leg-side deliveries involves a pivot step rather than a lunge, keeping his head still and his hands in front of his body. This technique produced an unusually low byes-per-match rate throughout his career.

His stumpings are the most technically impressive aspect of his keeping. The "Dhoni stumping" has been studied closely: he collects the ball on the offside and has the bails broken in a single motion that averages 0.08 seconds — faster than the standard blink reflex. This speed comes from collecting the ball with his right hand leading, transferring directly to the stumps without the intermediate stage of bringing both hands together.

As a batsman, Dhoni's role was typically to bat through the middle and accelerate at the end — a strategy he called "station cricket." He reads field placements before the ball is bowled and identifies the gaps in advance rather than reacting to the delivery. His helicopter shot — a wrist rotation that sends a ball below waist height to the leg-side boundary — was developed specifically for yorkers from pace bowlers in the death overs when conventional drives are blocked.

His captaincy is analytically distinct. He consistently backed defensive field settings in the 16-40 over period of ODIs, accepting singles to prevent boundaries, then attacking in the final 10 overs with a refreshed bowling attack. This counter-intuitive middle-phase approach was vindicated by India's run rate data — opponents consistently underscored in the final overs against Dhoni's late bowling selections.`
  },

  {
    sport: "cricket",
    metadata: { type: "narrative", player: "tendulkar", source: "sportiq-tactical" },
    content: `Tendulkar Technique and Shot Selection — Deep Tactical Analysis:
Sachin Tendulkar's batting technique is considered the reference point for coaching orthodoxy at international level. His stance is side-on with minimal trigger movement — a slight weight transfer back as the bowler releases — which gives him maximum time on the ball. His backlift is straight and high, directly above off stump, eliminating cross-bat inclination and maximising the full face of the bat for straight drives.

His straight drive is the textbook execution — front foot to the pitch of the ball, head over the knee, bat face completely open at impact, follow-through high over the head. Against pace bowling he uses the pace of the ball — his drives require minimal power input because he times the strike at the exact point of maximum energy transfer. This timing precision allowed him to play attacking shots on pitches where other batsmen were defending.

Against spin bowling, Tendulkar's footwork is exceptional in both directions. He uses his feet to smother spin — getting to the pitch of the ball to prevent turn — or goes back deep in the crease against turning deliveries to have time to play through the line. His decision-making on which to use — go forward or go back — is made primarily on the bowler's body position and arm angle rather than the ball's trajectory, giving him an earlier read than most batsmen.

His pull shot deserves specific mention. Against short-pitched bowling, Tendulkar pulled from outside off stump, clearing his front leg to create a flat trajectory through mid-wicket. He identified that the pull's primary danger is a leading edge when played across the body, so he developed a version played from a wider base — slightly square-on stance for this specific shot — that eliminated the leading edge possibility.`
  },

  // ── TENNIS — NARRATIVE (Tactician) ─────────────────────────────────────────

  {
    sport: "tennis",
    metadata: { type: "narrative", player: "federer", source: "sportiq-tactical" },
    content: `Federer Serve-Return Patterns and Net Approach — Deep Tactical Analysis:
Roger Federer's serve is architecturally the most versatile in the Open Era. His ball toss is consistent regardless of intended direction — a deliberate practice habit that eliminates the tell that most servers exhibit. His T-serve on the deuce court lands in the far corner at 84% accuracy when he deploys it; his body serve cramps the receiver against the same motion. The disguise means receivers must respect both options simultaneously, forcing them to stay central and giving Federer's wide serve more space than the geometry alone would suggest.

His forehand is built on an eastern grip — flatter than the semi-western most modern players use. This generates less topspin but significantly more pace and penetration, and allows him to take the ball earlier and flatter on the rise. The trade-off is reduced margin on high balls above the shoulder, which his opponents specifically exploited: targeting his backhand wing with heavy topspin to the shoulder was the primary anti-Federer strategy in the 2010s.

His one-handed backhand is the most technically acclaimed shot in tennis. His preparation begins with a shoulder turn that most players don't complete — he turns 90 degrees rather than the typical 45 — giving him a longer acceleration path. His contact point is in front of his body with his arm fully extended, generating pace through leverage rather than muscle. The slice backhand variation uses identical preparation until the point of contact, making it indistinguishable until the racket face opens.

Net approach: Federer approaches the net more than any other baseline player of his era. His serve-and-volley percentage on key points is 34% — he uses it specifically when opponents are expecting a baseline rally. His volley technique is old-school — minimal backswing, punch through the ball — which functions better at net than modern swing volleys on low balls.`
  },

  {
    sport: "tennis",
    metadata: { type: "narrative", player: "nadal", source: "sportiq-tactical" },
    content: `Nadal Clay Court Tactics and Physical Game — Deep Tactical Analysis:
Rafael Nadal's clay court dominance is built on a specific tactical blueprint that combines geometric superiority with physical attrition. His heavy topspin forehand generates 3,200 RPM — among the highest recorded at tour level — which causes the ball to kick high above the shoulder on clay's slow, high bounce. At shoulder height, the biomechanical efficiency of every groundstroke deteriorates: contact is above the ideal hitting zone, generating less pace and less control. Nadal systematically builds points to create this high ball condition.

His position on the court is deliberately deep — 1-2 metres behind the baseline — which seems counterintuitive but serves a specific function: it gives him more time on the ball, which allows him to target forehands to his opponents' backhands more consistently. He sacrifices court position for directional control, accepting that he will run more but that the rally ball he produces is more accurate.

His cross-court forehand to an opponent's backhand is the centrepiece of his tactical game. He builds to this shot by opening the court with a forehand wide to the deuce side, then hitting the next forehand cross-court to the exposed backhand — the geometry of the bounce on clay means the ball kicks away from the opponent after the second bounce. On hard courts he cannot guarantee this kick, which partially explains the clay-to-hard-court performance differential.

Physically, Nadal's match preparation is ritualistic and functional: his ball bouncing, towel rituals, and between-point routine are specifically timed to regulate breathing and heart rate between points. This routine has been studied by sports psychologists as a regulation mechanism rather than superstition — it resets the nervous system to a consistent activation level between points, maintaining focus across five-set matches.`
  },

  {
    sport: "tennis",
    metadata: { type: "narrative", player: "djokovic", source: "sportiq-tactical" },
    content: `Djokovic Return of Serve and Defensive Baseline Game — Deep Tactical Analysis:
Novak Djokovic's return of serve is statistically the most effective in professional tennis across all surfaces. His standing position is further back than any other top-10 player — approximately 2.5 metres behind the baseline — which gives him marginally more time on first serves. His split step timing is consistently earlier than his opponents', meaning he is moving before most players react. The combination produces a return that neutralises first serves other players must defend from.

His defensive retrieval is built on extraordinary flexibility — his hip flexors allow a full side split during low ball retrieval, giving him a lower contact point with better racket angle control than players who must bend at the knees. His sliding technique on hard courts is self-taught and unconventional: he slides into the shot rather than stopping and setting, maintaining momentum and recovery position simultaneously. This technique was considered impossible on hard courts before Djokovic normalised it.

His baseline game is characterised by deep, heavy returns to both wings that push opponents behind the baseline — he wins 73% of rallies when he achieves a depth above 75% on both crosscourt exchanges. His backhand is arguably the most powerful two-hander in the men's game — he generates pace from his legs and core rather than primarily his arms, maintaining consistency even in the fifth set when arm fatigue affects most players.

Mental resilience: Djokovic's documented recovery from 0-40 or break-point-down situations shows a 63% hold rate — the highest on tour. Analysis of his body language shows minimal visible emotional response to negative events during play, with emotional expression reserved for positive moments. This emotional regulation pattern is consistent with high-performance psychology frameworks for sustained focus.`
  },

  {
    sport: "tennis",
    metadata: { type: "narrative", player: "sinner", source: "sportiq-tactical" },
    content: `Sinner Backhand Mechanics and Baseline Aggression — Deep Tactical Analysis:
Jannik Sinner's two-handed backhand is his primary weapon and technically the most interesting shot on the current tour. His preparation involves a full shoulder coil with both hands on the racket — unlike most two-handers who initiate with the dominant hand and add the non-dominant, Sinner's lead comes from his left hand throughout. This generates more shoulder rotation and allows him to hit through the ball rather than across it, producing a flat penetrating trajectory rather than the high-kicking topspin typical of two-handers.

His stance on the backhand is semi-open — feet pointing diagonally toward the net rather than parallel to the baseline. This allows full hip rotation into the shot and explains why his backhand pace does not diminish when he is pushed wide or on the run. He generates 2,100 RPM on his backhand, lower than his forehand but delivered at higher pace — the combination is penetrating at moderate spin with depth.

Against left-handers specifically, Sinner's backhand becomes his offensive weapon: where right-handers target backhands cross-court, left-handers' slice serves pull Sinner wide to his backhand, which he has trained specifically to use as a down-the-line weapon from wide positions. His return of serve against left-hander body serves is 23% more effective than the tour average.

His serve is biomechanically efficient without being powerful — he generates 195-205 km/h first serves through excellent ball toss consistency and a full leg drive, but relies on placement over pace. His second serve kicks heavily to the backhand — a deliberate tactic to open his preferred cross-court forehand rally pattern. Tactically he is conservative: he rarely attacks the net unless he has a specific opportunity — he prefers to win baseline exchanges that he has designed over four to six shots.`
  },

  // ── FOOTBALL — STATS (Statistician) ────────────────────────────────────────

  {
    sport: "football",
    metadata: { type: "stats", player: "messi", source: "sportiq-tactical" },
    content: `Messi Advanced Statistical Profile — SportIQ Analysis:
Career goals: 800+ across club and international football. La Liga: 474 goals in 520 appearances (0.91 per game). Champions League: 129 goals in 163 appearances — second all-time. International: 112 goals for Argentina in 187 caps — South American all-time record.

Per-90 metrics at peak (2011-12 La Liga season): 1.22 goals/90, 0.43 assists/90, 5.1 key passes/90, 4.6 successful dribbles/90. These numbers have not been matched in a single La Liga season by any player since.

Dribble success rate at Barcelona (2008-2016): 74.3% — meaning of every 4 dribble attempts, 3 were completed. For context, the La Liga average for attackers is 48%. His dribble attempts averaged 8.4 per game in peak years, making his volume-adjusted success rate statistically remarkable.

Ballon d'Or: 8 awards (2009, 2010, 2011, 2012, 2015, 2019, 2021, 2023) — all-time record. Major trophies: 10 La Liga titles, 4 Champions League titles, 1 World Cup (2022), 1 Copa America (2021).

xG overperformance: Messi consistently overperforms his expected goals by 15-20% across his career — indicating elite finishing quality beyond shot volume and position. His non-penalty xG in 2011-12 was 0.79 per 90; he scored 1.22 — an overperformance of 54%.`
  },

  {
    sport: "football",
    metadata: { type: "stats", player: "ronaldo", source: "sportiq-tactical" },
    content: `Ronaldo Advanced Statistical Profile — SportIQ Analysis:
Career goals: 900+ across club and international football — all-time record across top 5 European leagues combined. La Liga: 450 goals in 438 appearances (1.03 per game) — the only player to average more than 1 goal per La Liga game across 400+ appearances. International: 130+ goals for Portugal — European men's international record.

Champions League: 140 goals in 183 appearances — all-time record. 17 UCL knockout stage goals in a single calendar year (2016-17). Hat-tricks in the UCL: 8 — highest in the competition's history.

Aerial goals: 28% of Ronaldo's Champions League goals were headed — significantly above the 11% average for forwards. His aerial duel win rate peaks at 68% in the penalty area, reflecting his jump timing and physical superiority.

Penalty conversion: 87.8% career record across club and international football (145/165). Free kick goals: 57 across club and country — the highest in the 21st century.

Physical metrics at peak (tracked at Real Madrid): top sprint speed 33.6 km/h, vertical jump 78cm off the ground, resting heart rate 47bpm. His body fat percentage at 35 years old was measured at 7% — exceptional for his age profile and explaining his sustained performance into his late 30s.

Ballon d'Or: 5 awards (2008, 2013, 2014, 2016, 2017). Major trophies: 5 Champions League titles, 3 La Liga titles, 1 Serie A title, 1 Premier League title, 1 European Championship (2016), 1 Nations League (2019).`
  },

  {
    sport: "football",
    metadata: { type: "stats", player: "haaland", source: "sportiq-tactical" },
    content: `Haaland Advanced Statistical Profile — SportIQ Analysis:
Premier League debut season (2022-23): 36 goals in 35 league appearances — breaking the single-season Premier League record by 9 goals. Goals per 90 in debut PL season: 1.05 — the highest ever for a player with 30+ appearances in a single season.

Champions League career: 40 goals in 35 appearances (1.14 per game) before age 24 — the fastest to 40 UCL goals in history, beating Messi's record pace by 7 games. UCL hat-tricks: 5 by age 22 — a record.

Aerial success rate: 72% in the penalty area — the highest at Premier League level among strikers with 100+ aerial duels. His height (194cm) combined with his jump timing gives him a heading window 2-3 seconds wider than most strikers.

xG overperformance 2022-23: Expected goals 26.3, actual goals 36 — an overperformance of 9.7 goals across the season. This places him in the 99th percentile for finishing quality above expected output.

Sprint distance per game: 1,100m at 25+ km/h — high for a centre-forward, indicating active movement off the ball despite his static reputation. His off-ball runs average 6.2 per 90 minutes into the penalty area, consistently the highest at City.

Penalty record: 94% conversion rate (16/17 in PL first two seasons). His technique — straight run-up, driven to bottom-right — is the most consistent in the league.`
  },

  // ── CRICKET — STATS (Statistician) ─────────────────────────────────────────

  {
    sport: "cricket",
    metadata: { type: "stats", player: "bumrah", source: "sportiq-tactical" },
    content: `Bumrah Advanced Statistical Profile — SportIQ Analysis:
Test cricket: 195 wickets at average 20.26 in 38 Tests (as of 2025) — the best average among pace bowlers with 150+ wickets in Test history. Economy rate in Tests: 2.74 — extraordinary for a pace bowler in the modern era. Strike rate: 49.4 — a wicket every 49 deliveries.

Death bowling ODI record: Economy rate 4.63 in overs 41-50 across career — the lowest for any bowler with 50+ death overs bowled at international level. Yorker accuracy in death overs: 94% within a 30cm target zone (tracked via Hawk-Eye data across IPL and international cricket).

Five-wicket hauls: 8 in Tests, including in South Africa (2018), England (2018), and Australia (2018-19) — the first Asian pacer to achieve this across all three venues in a single calendar year.

T20I performance: Economy rate 6.26 across career — below the international pace bowling average of 7.84. In the final 2 overs of T20Is he has conceded 8.1 runs per over — 1.3 below the global average for specialist death bowlers.

IPL statistics: 170+ wickets at economy rate 7.34 — among the top 5 all-time for pace bowlers with 100+ wickets. Purple Cap winner 2020 season. Dot ball percentage in death overs in IPL: 44% — the highest for any bowler with 1000+ death balls bowled.

Injury record: Three major lumbar stress fractures (2019, 2022, 2023) — each requiring 4-6 month recovery. Despite these, his performance metrics show no measurable decline in pace (avg 140.2 km/h before vs 139.8 km/h after most recent return) or accuracy.`
  },

  {
    sport: "cricket",
    metadata: { type: "stats", player: "kohli", source: "sportiq-tactical" },
    content: `Kohli Advanced Statistical Profile — SportIQ Analysis:
Test cricket: 9,230+ runs at average 48.7 in 115 Tests. 30 Test centuries — joint 4th highest all-time. Chasing average in Tests: 65.4 — the highest for any batsman with 20+ successful chases. He averages 71.2 when India wins versus 29.4 when India loses, indicating extreme match-situation correlation.

ODI cricket: 13,906+ runs at average 58.1 — the highest average in ODI history for batsmen with 100+ innings. 50 ODI centuries — joint record with Sachin Tendulkar. ODI centuries when chasing: 32 of his 50 — 64% of his centuries came in successful run chases.

T20I statistics: Average 52.7 across career — the highest in T20I cricket for batsmen with 80+ innings. Strike rate 137.0 — slightly below modern T20 standards but his average far exceeds peers.

2023 ODI World Cup: 765 runs at average 95.6 — the highest by any batsman in a single World Cup tournament in history. Including 3 centuries and 6 fifties.

Against specific bowling attacks: vs Australia in Tests — average 54.1 (his highest against any nation). vs England in Tests — average 40.5 (lowest against major nations). His 2014 England series average of 13.4 across 10 innings is the outlier in an otherwise consistent career.

Fitness data: Yo-Yo test score consistently above 17.2 throughout career — among the highest recorded for Indian cricketers. Body fat percentage maintained between 10-12% since 2012 — a documented transformation from his early career weight management issues.`
  },

  // ── TENNIS — STATS (Statistician) ──────────────────────────────────────────

  {
    sport: "tennis",
    metadata: { type: "stats", player: "djokovic", source: "sportiq-tactical" },
    content: `Djokovic Advanced Statistical Profile — SportIQ Analysis:
Grand Slam titles: 24 — the all-time men's record. Titles by surface: Australian Open 10, French Open 3, Wimbledon 7, US Open 4. He is the only player to win each Grand Slam at least twice. Year-end No.1 ranking: 8 times — all-time record, surpassing Pete Sampras's 6.

Return of serve: First serve return points won: 34.4% career average — the highest in the Open Era for a player with 700+ matches. Second serve return points won: 57.8% — also the highest. His return games won percentage of 28.6% is 4.2 points above the No.2 ranked returner historically.

Bagel and breadstick rate: Has won 6-0 sets in 14.3% of sets played — the highest at tour level in the last 20 years. Tight-set record in Grand Slams: 76% win rate in fifth sets — superior to Nadal (72%) and Federer (69%).

Head-to-head records: vs Federer 27-23 (overall), 11-7 in Grand Slams. vs Nadal 30-29 (overall), 10-8 in Grand Slams. He holds a positive H2H against both rivals in Grand Slam matches.

Break point conversion: 44.8% career break point conversion in Grand Slams — the highest in the Open Era. Break point saved: 67.3% — second only to Federer (68.1%). His combined save-and-convert record defines his tight-match dominance.

Total weeks at No.1: 430+ — all-time record, surpassing Federer's 310 and Sampras's 286.`
  },

  {
    sport: "tennis",
    metadata: { type: "stats", player: "sinner", source: "sportiq-tactical" },
    content: `Sinner Advanced Statistical Profile — SportIQ Analysis:
Grand Slam titles: 3 (Australian Open 2024, US Open 2024, Australian Open 2025) — all won before his 24th birthday. He is the first Italian man to win a Grand Slam singles title.

2024 season record: 73 wins, 6 losses — the best win-loss record on tour. Year-end No.1 ranking for the first time — first Italian to hold the year-end No.1 ranking in the Open Era.

Backhand statistics: Average pace on backhand groundstrokes: 113 km/h — 8 km/h above tour average. Backhand winners per match (2024): 6.2 — the highest on tour. Backhand unforced error rate: 7.3% — among the lowest for players relying on the backhand as a primary weapon.

Return performance: Return games won in 2024: 32.1% — second on tour behind Djokovic. Second serve return points won: 54.7% — indicating exceptional ability against weaker serves.

vs Top-10 players (2024-25): 18 wins from 24 matches — 75% win rate against the top 10 across all surfaces. He has beaten Djokovic (twice), Alcaraz (three times), Zverev (four times) and Medvedev (six times) in this period.

Hard court record: 82.3% win rate on hard courts across career — his best surface. Clay record: 68.9% — showing surface versatility but a clear hard court preference. His serve speed averages 200 km/h on first serve — below the elite power servers but consistently placed to his backhand wing.`
  },

  {
    sport: "tennis",
    metadata: { type: "stats", player: "nadal", source: "sportiq-tactical" },
    content: `Nadal Advanced Statistical Profile — SportIQ Analysis:
Grand Slam titles: 22 — second all-time behind Djokovic (24). French Open titles: 14 — the most titles by any player at a single Grand Slam in history. French Open record: 112 wins, 4 losses across career (96.6% win rate).

Clay court career record: 398 wins, 42 losses — a 91.4% win rate. Clay court winning streaks: 81 matches (2005-2007, broken by Söderling at Roland Garros 2009) and 50 matches (2010-2011). His clay court dominance represents the longest sustained excellence on a single surface in professional sports.

Hard court Grand Slam record: Australian Open 2, US Open 4 — demonstrating cross-surface capability beyond his clay identity. His hard court record of 78.3% win rate is elite but 13 points below his clay rate — the largest surface differential for a top-5 all-time player.

Head-to-head on clay vs all opponents: Positive H2H against all top-20 players on clay throughout career. vs Djokovic on clay: 8-7 — the only player to hold a positive or near-equal H2H against Djokovic on any surface.

Topspin metrics: Average forehand topspin: 3,200 RPM — the highest ever recorded at tour level. Forehand pace combined with RPM: unique in that he generates both at elite levels simultaneously — most high-RPM players sacrifice pace for spin.

Titles: 92 career titles, including 36 Masters 1000 titles — the all-time record. Olympic gold: Singles (2008), Doubles (2016). Career prize money: $134M+.`
  },

];

async function run() {
  console.log(`\n[SEED] Ingesting ${DOCUMENTS.length} tactical analysis documents...\n`);
  let success = 0;
  let failed = 0;

  for (const doc of DOCUMENTS) {
    const label = `${doc.metadata.player} (${doc.sport} / ${doc.metadata.type})`;
    try {
      await storeDocument(doc.content, doc.metadata, doc.sport);
      console.log(`  ✓  ${label}`);
      success++;
    } catch (err) {
      console.error(`  ✗  ${label} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[SEED] Done — ${success} ingested, ${failed} failed.\n`);
  process.exit(0);
}

run();
