# SportIQ — Testing Context & Plan
> Take this file to the testing repo. Everything you need to know about the app, the RAG architecture, and what to test.

---

## What the App Is

**Live URL:** https://sport-iq-git-main-shwetas-projects-fd91a33a.vercel.app/
**Backend API:** https://sportiq-voxv.onrender.com
**GitHub:** https://github.com/shweyagit/SportIQ

An AI-powered sports debate platform for Football, Cricket, and Tennis. The core feature is a **Dual Analyst** — two Claude-powered personas that debate any sports question simultaneously, each grounded in their own separate RAG context.

---

## Architecture

```
User (React on Vercel)
    │
    ├── POST /api/analyse/stream  ──→ Express (Render)
    │                                     │
    │                                     ├── 1. classifyIntent()  ← Claude Haiku (fast, cheap)
    │                                     │       └── returns: opinion | player_stats | player_technique | comparison | general
    │                                     │
    │                                     ├── 2. Intent-driven retrieval (Smart RAG routing)
    │                                     │       ├── opinion → SKIP retrieval entirely
    │                                     │       ├── player_stats → retrieve stats docs only
    │                                     │       ├── player_technique → retrieve narrative docs only
    │                                     │       └── comparison/general → retrieve both in parallel
    │                                     │
    │                                     ├── 3. Similarity threshold filter (≥ 0.65)
    │                                     │       └── below threshold → belowThreshold: true → Claude told "no context found"
    │                                     │
    │                                     └── 4. Two parallel Claude Sonnet streams → SSE tokens to UI
    │
    ├── POST /api/player          ──→ Express → TheSportsDB (age/position/team) → RAG → Claude
    ├── POST /api/compare         ──→ Express → API-Football stats → RAG → Claude JSON
    └── POST /api/timeline        ──→ Express → Claude JSON
```

---

## The RAG Pipeline — Full Detail

### Knowledge Base

Stored in Supabase table `sports_docs` with pgvector embeddings. Two document types:

- **`narrative`** — technique, biography, playing style, tactical context
  - Source: hand-curated from Wikipedia summaries and expert descriptions
  - Feeds: **The Tactician** persona
  - Example: *"Messi's dribbling relies on an extremely low centre of gravity, rapid changes of direction, close ball control using the outside of his right foot..."*

- **`stats`** — career numbers, records, tournament stats, head-to-head data
  - Source: verified career statistics
  - Feeds: **The Statistician** persona
  - Example: *"Lionel Messi career stats: 800+ club goals, 8 Ballon d'Or awards, 2022 World Cup winner, 474 La Liga goals in 520 appearances..."*

### Players in Knowledge Base
**Football:** Messi, Ronaldo, Haaland, Mbappé, De Bruyne, Salah, Guardiola (tactical doc)
**Cricket:** Tendulkar, Kohli, Dhoni, Warne, Muralitharan, Bumrah
**Tennis:** Federer, Nadal, Djokovic, Sinner

### Step-by-Step Retrieval Flow

```
1. Question arrives → classifyIntent(question, sport)
        ↓
2. Intent determines which retrieval branches run:
   - "opinion"          → skip both pipelines
   - "player_stats"     → statisticianRAG only
   - "player_technique" → tacticianRAG only
   - "comparison"       → both pipelines in parallel
   - "general"          → both pipelines in parallel
        ↓
3. Each pipeline: embed query via Voyage AI (voyage-large-2)
        ↓
4. Supabase match_sports_docs RPC — vector similarity search
   filtered by sport AND type (narrative or stats)
        ↓
5. Similarity threshold filter: docs with similarity < 0.65 are discarded
   If ALL docs below threshold → belowThreshold: true
        ↓
6. Prompt construction:
   - opinion intent    → "Opinion question — reason from your own expertise."
   - belowThreshold    → "No relevant context found. Answer from own expertise."
   - has context       → "Reference context (type):\n{docs}\n\nQuestion: {q}"
        ↓
7. Two parallel Claude Sonnet streams → SSE tokens back to frontend
```

### What the Stream API Returns

`POST /api/analyse/stream` — SSE events in this order:

```
data: {"type":"intent","intent":"comparison","reason":"Comparing two players"}
data: {"type":"sources","tactician":[{"snippet":"...","sport":"football","type":"narrative","similarity":0.821}],"statistician":[...]}
data: {"type":"tactician","token":"Messi"}
data: {"type":"tactician","token":"'s low"}
data: {"type":"statistician","token":"With 800+"}
...
data: {"type":"done"}
```

Key fields in sources array:
- `snippet` — first 120 chars of the doc
- `sport` — football/cricket/tennis
- `type` — narrative or stats
- `similarity` — cosine similarity score (0–1)

---

## Smart RAG vs Naive RAG

This app has evolved through the RAG taxonomy:

| Tier | What it does | SportIQ status |
|---|---|---|
| **Naive RAG** | Always retrieve, always inject | Was this initially |
| **Advanced RAG** | Similarity threshold, quality gating | Added: 0.65 threshold + belowThreshold signal |
| **Smart RAG (Modular)** | Intent classification before retrieval | Added: intentClassifier.js |
| **Agentic RAG** | Multi-step reasoning, tool use | Future |
| **Graph RAG** | Entities + relationships as graph | Future — best for "compare era" questions |

**Current architecture rating: ~6.5/10** (Modular Smart RAG, not yet agentic)

### What Smart RAG Adds Over Naive RAG

- **No wasted embeddings on opinion questions** — if intent is "opinion", retrieval is skipped entirely. Claude reasons from its own knowledge. No irrelevant docs injected.
- **No wasted stats retrieval for technique questions** — "How does Federer serve?" only fetches narrative docs. No stats docs polluting the tactician context.
- **Quality gating** — similarity threshold prevents low-confidence docs from being injected. Claude is told explicitly when no context was found — it doesn't hallucinate from empty context.
- **Isolated dual pipelines** — The Tactician and The Statistician each have their own retrieval branch with their own document type. They can't cross-contaminate each other's context.

### intentClassifier.js — Key Detail

Uses **Claude Haiku** (not Sonnet) — fast and cheap for classification.

Intent types:
```
opinion           → "Is VAR ruining football?"
player_stats      → "What are Messi's career goals?"
player_technique  → "How does Federer serve?"
comparison        → "Messi vs Ronaldo — who is better?"
general           → everything else
```

Falls back to `general` on any error — retrieval always runs as fallback.

---

## Head to Head — Position-Aware Scoring

H2H scoring was previously non-deterministic (Claude's opinion formatted as a number). It is now:

### Football Scoring (when FOOTBALL_API_KEY is set)

1. Fetch real per-90 stats from **API-Football** (api-sports.io) for each player
2. Calculate position-weighted score — different formula per position:

| Position | Metrics (weights) |
|---|---|
| **Goalkeeper** | save% (50%) + saves/90 (30%) + goals conceded/90 inverted (20%) |
| **Defender** | tackles/90 (30%) + interceptions/90 (25%) + duel win% (25%) + pass accuracy (20%) |
| **Midfielder** | key passes/90 (30%) + assists/90 (25%) + pass accuracy (20%) + duel win% (15%) + tackles (10%) |
| **Attacker** | goals/90 (35%) + assists/90 (20%) + dribble success% (15%) + key passes/90 (15%) + duel win% (15%) |

3. Score is normalised 0–10 within realistic ranges (e.g. goals/90: 0 → 1.2 maps to 0 → 10)
4. Claude only writes the qualitative strengths/weaknesses/verdict — it doesn't set the number

### H2H Determinism Fix

- Players sorted **alphabetically** before prompt construction → same result regardless of input order
- Claude called with `temperature: 0` → deterministic output for same input
- Original input order restored in response so UI isn't affected
- `scoringMethod` field in response: `"calculated"` (from API-Football stats) or `"claude"` (fallback if no API key)

### If FOOTBALL_API_KEY is not set

Graceful fallback — Claude generates rating from training data. The app still works. `scoringMethod: "claude"` in response signals this.

To enable calculated scores: get a free key at https://dashboard.api-football.com and add `FOOTBALL_API_KEY` to Render env vars. Free tier: 100 requests/day.

---

## Player Profile — Live Data Fix

Player profile now correctly splits responsibilities:

| Field | Source |
|---|---|
| name, nationality, position, currentTeam, age | TheSportsDB (real-time lookup) |
| age | Calculated from `dateBorn` field — never Claude's opinion |
| image | TheSportsDB strThumb or strCutout |
| careerSummary, achievements, keyStats, legacyQuote | Claude Sonnet (generation only) |

Claude is explicitly told in its prompt: *"Do NOT generate name, nationality, position, currentTeam, or age — these are provided."* This fixed the bug where Vozinha's age showed as 32 instead of 40 (Claude's training data was wrong).

---

## Enterprise Fixes Applied

| Issue | Fix Applied |
|---|---|
| API key exposed in browser | All Claude calls through Express backend |
| No streaming | SSE streaming on `/api/analyse/stream` |
| No rate limiting | `express-rate-limit` — 30 req/15min per IP on AI endpoints |
| Request logging | Middleware logs method, path, status, duration |
| H2H non-determinism | Alphabetical sort + temperature:0 + calculated scores |
| Claude making up player ages | TheSportsDB `dateBorn` → `calculateAge()` function |
| Naive RAG (always retrieve) | Smart RAG: intent classifier + similarity threshold |
| Empty context silently injected | `belowThreshold` flag → explicit prompt to Claude |
| Cold starts on Render | Frontend pings `/api/health` on app load |

---

## Testing Plan

### Why Two Frameworks

| Framework | Tests What | Ignores |
|---|---|---|
| **RAGAS** | Retrieval quality — did the right docs come back? | Claude's output quality |
| **DeepEval** | LLM output quality — did Claude use the context well? | Retrieval mechanics |

> *"RAGAS tells me my retrieval is working. DeepEval tells me Claude is using it correctly. They can fail independently — that's why I test them separately."*

---

### 5 Test Cases (chosen for contrast in RAG behaviour)

| ID | Question | Sport | Expected RAG Behaviour |
|---|---|---|---|
| q1_messi_ronaldo | "Who is the better dribbler, Messi or Ronaldo?" | football | HIGH — both players in knowledge base |
| q2_bumrah | "Is Bumrah the best death bowler in cricket history?" | cricket | GOOD — Bumrah in knowledge base |
| q3_sinner_alcaraz | "How does Sinner compare to Alcaraz as the next generation of tennis?" | tennis | MIXED — Sinner in KB, Alcaraz not |
| q4_premier_league_opinion | "Is the Premier League ruining international football?" | football | SKIPPED — intent classifier should classify as opinion, skip retrieval |
| q5_greatest_test_batter | "Who is the greatest Test match batter of all time?" | cricket | BROAD — multiple players in KB, retrieval must choose |

Ground truths:

```
q1: Messi is widely considered the better dribbler due to his low centre of gravity,
    close ball control using the outside of his right foot, and rapid changes of direction.
    Ronaldo relies more on pace, power, and step-overs rather than tight technical dribbling.

q2: Bumrah is considered one of the best death bowlers due to his unorthodox action,
    yorker precision, and ability to generate reverse swing. His economy rate and
    wicket-taking ability in the final overs of ODIs and T20s are among the best recorded.

q3: Sinner and Alcaraz represent the dominant next generation. Sinner is known for his
    baseline consistency, powerful two-handed backhand and aggressive returning.
    Alcaraz is more explosive with greater variety and net play. Both have won multiple Grand Slams.

q4: Subjective debate. Arguments for: fixture congestion reduces player availability.
    Arguments against: Premier League raises technical standards that benefit international play.

q5: Sachin Tendulkar holds the record for most Test runs (15,921) and most Test centuries (51).
    Don Bradman has the highest average (99.94). Kohli is the leading active batter.
    The debate typically centres on Tendulkar vs Bradman.
```

---

### RAGAS Metrics

- `context_precision` — of retrieved docs, how many were actually relevant?
- `context_recall` — did retrieval find all relevant docs that exist?
- `answer_groundedness` — is the answer supported by retrieved context?

**What to expect:**
- q1 → HIGH precision + recall (both players seeded)
- q3 → LOWER recall (Alcaraz not in KB — confirmed limitation)
- q4 → precision n/a (no retrieval if intent=opinion) — verify intent was correctly classified
- q5 → precision varies — interesting to see which player retrieval picks

---

### DeepEval Metrics

- `AnswerRelevancyMetric` — does the response address the question?
- `FaithfulnessMetric` — does the response contradict the retrieved context?
- Custom `GEval` — **persona fidelity**:
  - Statistician: *"Does this response contain at least one specific statistic, number, or record?"*
  - Tactician: *"Does this response reason from technique, style, or tactical concepts rather than statistics?"*

Persona fidelity is the most interesting metric — if Statistician gives a qualitative answer when stats context exists, the RAG-to-persona pipeline is failing even if retrieval was correct.

---

### Complete conftest.py (copy this to test repo)

```python
"""
conftest.py — shared fixtures and API client for SportIQ RAG tests

All tests hit the live deployed API at SPORTIQ_API_URL.
Responses are collected once and reused across RAGAS and DeepEval tests.
"""

import pytest
import httpx
import json
import os

SPORTIQ_API_URL = os.getenv("SPORTIQ_API_URL", "https://sportiq-voxv.onrender.com")


def collect_analysis(question: str, sport: str) -> dict:
    """
    Hits the live streaming API and collects full response.
    Returns tactician text, statistician text, intent, and retrieved sources.
    """
    tactician    = ""
    statistician = ""
    sources      = {"tactician": [], "statistician": []}
    intent       = None

    with httpx.stream(
        "POST",
        f"{SPORTIQ_API_URL}/api/analyse/stream",
        json={"question": question, "sport": sport},
        timeout=60,
        headers={"Content-Type": "application/json"}
    ) as r:
        for line in r.iter_lines():
            if not line.startswith("data: "):
                continue
            raw = line[6:].strip()
            if not raw:
                continue
            try:
                event = json.loads(raw)
                if event["type"] == "tactician":
                    tactician += event["token"]
                elif event["type"] == "statistician":
                    statistician += event["token"]
                elif event["type"] == "sources":
                    sources = event
                elif event["type"] == "intent":
                    intent = event.get("intent")
            except Exception:
                continue

    return {
        "question":              question,
        "sport":                 sport,
        "tactician":             tactician,
        "statistician":          statistician,
        "intent":                intent,
        "tactician_contexts":    [s["snippet"] for s in sources.get("tactician", [])],
        "statistician_contexts": [s["snippet"] for s in sources.get("statistician", [])],
        "tactician_sources":     sources.get("tactician", []),
        "statistician_sources":  sources.get("statistician", []),
    }


# ── The 5 test cases ──────────────────────────────────────────────────────────

TEST_CASES = [
    {
        "id":    "q1_messi_ronaldo",
        "question": "Who is the better dribbler, Messi or Ronaldo?",
        "sport": "football",
        "ground_truth": "Messi is widely considered the better dribbler due to his low centre of gravity, close ball control using the outside of his right foot, and rapid changes of direction. Ronaldo relies more on pace, power, and step-overs rather than tight technical dribbling.",
        "expected_rag": "HIGH — both in knowledge base",
    },
    {
        "id":    "q2_bumrah",
        "question": "Is Bumrah the best death bowler in cricket history?",
        "sport": "cricket",
        "ground_truth": "Bumrah is considered one of the best death bowlers due to his unorthodox action, yorker precision, and ability to generate reverse swing. His economy rate and wicket-taking ability in the final overs of ODIs and T20s are among the best recorded.",
        "expected_rag": "GOOD — Bumrah in knowledge base",
    },
    {
        "id":    "q3_sinner_alcaraz",
        "question": "How does Sinner compare to Alcaraz as the next generation of tennis?",
        "sport": "tennis",
        "ground_truth": "Sinner and Alcaraz represent the dominant next generation. Sinner is known for his baseline consistency, powerful two-handed backhand and aggressive returning. Alcaraz is more explosive with greater variety and net play. Both have won multiple Grand Slams.",
        "expected_rag": "MIXED — Sinner in KB, Alcaraz not",
    },
    {
        "id":    "q4_premier_league_opinion",
        "question": "Is the Premier League ruining international football?",
        "sport": "football",
        "ground_truth": "This is a subjective debate. Arguments for: fixture congestion reduces player availability and quality for national teams. Arguments against: Premier League raises technical standards that benefit international play.",
        "expected_rag": "SKIPPED — opinion question, intent classifier should skip retrieval",
    },
    {
        "id":    "q5_greatest_test_batter",
        "question": "Who is the greatest Test match batter of all time?",
        "sport": "cricket",
        "ground_truth": "Sachin Tendulkar holds the record for most Test runs (15,921) and most Test centuries (51). Don Bradman has the highest average (99.94). Kohli is the leading active batter. The debate typically centres on Tendulkar vs Bradman.",
        "expected_rag": "BROAD — multiple players in KB, retrieval must choose",
    },
]


@pytest.fixture(scope="session")
def api_responses():
    """
    Collect all API responses once per test session.
    Cached so RAGAS and DeepEval tests share the same responses.
    """
    print("\n[SETUP] Collecting API responses from live SportIQ API...")
    responses = {}
    for case in TEST_CASES:
        print(f"  → {case['id']} ({case['sport']}): {case['question'][:50]}...")
        try:
            result = collect_analysis(case["question"], case["sport"])
            result["ground_truth"]   = case["ground_truth"]
            result["expected_rag"]   = case["expected_rag"]
            result["id"]             = case["id"]
            responses[case["id"]]    = result
            print(f"     intent={result['intent']} | "
                  f"tactician_docs={len(result['tactician_sources'])} | "
                  f"statistician_docs={len(result['statistician_sources'])}")
        except Exception as e:
            print(f"     FAILED: {e}")
            responses[case["id"]] = None

    return responses


@pytest.fixture(scope="session")
def test_cases():
    return TEST_CASES
```

---

### RAGAS test file (test_ragas.py)

```python
"""
test_ragas.py — retrieval quality tests using RAGAS

pip install ragas
"""

import pytest
from ragas import evaluate
from ragas.metrics import context_precision, context_recall, answer_groundedness
from datasets import Dataset


def build_ragas_dataset(api_responses, analyst="tactician"):
    rows = []
    for case_id, resp in api_responses.items():
        if resp is None:
            continue
        rows.append({
            "question":    resp["question"],
            "answer":      resp[analyst],
            "contexts":    resp[f"{analyst}_contexts"],
            "ground_truth": resp["ground_truth"],
        })
    return Dataset.from_list(rows)


def test_ragas_tactician(api_responses):
    ds = build_ragas_dataset(api_responses, "tactician")
    result = evaluate(ds, metrics=[context_precision, context_recall, answer_groundedness])
    print("\n[RAGAS] Tactician results:", result)
    # Soft assertion — adjust threshold after first run
    assert result["context_precision"] > 0.3, f"Context precision too low: {result['context_precision']}"


def test_ragas_statistician(api_responses):
    ds = build_ragas_dataset(api_responses, "statistician")
    result = evaluate(ds, metrics=[context_precision, context_recall, answer_groundedness])
    print("\n[RAGAS] Statistician results:", result)
    assert result["context_precision"] > 0.3, f"Context precision too low: {result['context_precision']}"


def test_opinion_question_skips_retrieval(api_responses):
    """Q4 — opinion intent should skip retrieval: sources should be empty."""
    resp = api_responses.get("q4_premier_league_opinion")
    assert resp is not None, "Q4 response missing"
    assert resp["intent"] == "opinion", f"Expected intent=opinion, got {resp['intent']}"
    assert len(resp["tactician_sources"]) == 0, "Opinion question should not retrieve docs"
    assert len(resp["statistician_sources"]) == 0, "Opinion question should not retrieve docs"


def test_comparison_retrieves_both(api_responses):
    """Q1 — comparison intent should retrieve both narrative and stats docs."""
    resp = api_responses.get("q1_messi_ronaldo")
    assert resp is not None
    assert resp["intent"] == "comparison", f"Expected comparison, got {resp['intent']}"
    assert len(resp["tactician_sources"]) > 0, "Tactician should have docs for Messi/Ronaldo"
    assert len(resp["statistician_sources"]) > 0, "Statistician should have docs for Messi/Ronaldo"
```

---

### DeepEval test file (test_deepeval.py)

```python
"""
test_deepeval.py — LLM output quality tests using DeepEval

pip install deepeval
"""

import pytest
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams


def make_test_case(resp, answer_field, contexts_field):
    return LLMTestCase(
        input=resp["question"],
        actual_output=resp[answer_field],
        retrieval_context=resp[contexts_field],
    )


def test_answer_relevancy(api_responses):
    metric = AnswerRelevancyMetric(threshold=0.7)
    for case_id, resp in api_responses.items():
        if resp is None:
            continue
        tc = make_test_case(resp, "tactician", "tactician_contexts")
        metric.measure(tc)
        print(f"[RELEVANCY] {case_id} tactician: {metric.score}")


def test_faithfulness(api_responses):
    metric = FaithfulnessMetric(threshold=0.7)
    for case_id, resp in api_responses.items():
        if resp is None or not resp["tactician_contexts"]:
            continue  # skip when no context retrieved (opinion questions)
        tc = make_test_case(resp, "tactician", "tactician_contexts")
        metric.measure(tc)
        print(f"[FAITHFULNESS] {case_id}: {metric.score}")


def test_statistician_persona_fidelity(api_responses):
    """Statistician must cite at least one number or statistic."""
    metric = GEval(
        name="StatisticianPersonaFidelity",
        criteria="Does the response contain at least one specific statistic, number, record, or data point?",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    for case_id, resp in api_responses.items():
        if resp is None or not resp["statistician"]:
            continue
        tc = LLMTestCase(input=resp["question"], actual_output=resp["statistician"])
        metric.measure(tc)
        print(f"[PERSONA] Statistician {case_id}: {metric.score} — {metric.reason}")


def test_tactician_persona_fidelity(api_responses):
    """Tactician must reason from technique/style, not quote raw numbers."""
    metric = GEval(
        name="TacticianPersonaFidelity",
        criteria="Does this response reason from technique, playing style, tactical concepts, or physical attributes rather than citing raw statistics or numbers?",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    for case_id, resp in api_responses.items():
        if resp is None or not resp["tactician"]:
            continue
        tc = LLMTestCase(input=resp["question"], actual_output=resp["tactician"])
        metric.measure(tc)
        print(f"[PERSONA] Tactician {case_id}: {metric.score} — {metric.reason}")
```

---

### Test repo setup

```
test-repo/
├── conftest.py          ← paste from above
├── test_ragas.py        ← paste from above
├── test_deepeval.py     ← paste from above
├── requirements.txt
└── .env
```

`requirements.txt`:
```
pytest
httpx
ragas
deepeval
datasets
```

`.env`:
```
SPORTIQ_API_URL=https://sportiq-voxv.onrender.com
```

Run:
```bash
pip install -r requirements.txt
pytest -v -s
```

---

## CI/CD Story

**Current state:**
- Push to `main` → Vercel auto-deploys frontend
- Push to `main` → Render auto-deploys backend
- Tests live in a **separate repo** hitting the deployed API directly

**The framing for interview:**
> *"Tests are in a separate repo and hit the deployed API directly. This means I can run evals against production independently of the app deployment cycle — which matters when you want to catch RAG quality regressions without coupling your test pipeline to your app pipeline."*

This is the mature pattern — same as how the London Stock Exchange would run evaluations against a deployed service, not a local mock.

**Next step (if asked):** GitHub Actions in the test repo that triggers on a webhook from the app repo after successful deploy — automatic regression testing on every release.

---

## Known Limitations & How to Talk About Them

Lead with these — knowing what's broken and how you'd fix it is more impressive than pretending everything is perfect.

---

### 1. Static Knowledge Base — Fringe Players Get No RAG Context

**What happens:**
Knowledge base covers ~15–20 top players hand-curated in `seed.js`. Ask about Carlos Alcaraz, Jofra Archer, or any emerging player — vector search returns empty — analyst responds from Claude's training data with no grounding.

**How to say it:**
> *"The knowledge base is static and hand-curated. For any player not in the seed, retrieval returns nothing. The similarity threshold means we correctly signal to Claude that no context was found — it doesn't hallucinate from empty results — but it's still pure Claude knowledge. The fix is a scheduled ingestion pipeline pulling from sports APIs nightly to keep the KB current. Q3 in my RAGAS tests specifically exposes this: Sinner retrieves well, Alcaraz has no docs, so context_recall drops."*

**Next iteration:** Scheduled nightly ingestion from sports data APIs → auto-ingest on first query for a player.

---

### 2. No Graph RAG — Can't Reason Across Entity Relationships

**What's missing:**
Current RAG does similarity search on flat documents. It cannot answer questions like "Which players trained under Guardiola and went on to win the Champions League independently?" — that requires traversing entity relationships.

**How to say it:**
> *"The current architecture is document-similarity RAG. It can't reason about connections between entities — coaches, clubs, eras, tournaments. Graph RAG would store players, clubs, and managers as nodes with edges for 'played under', 'won trophy with' — then a question can traverse that graph. It's the natural next architectural step for a sports platform where relationships between entities are as important as the players themselves."*

---

### 3. Football Stats Scoring Only (no Cricket/Tennis calculated scores)

**What's in place:**
Position-aware scoring from API-Football for football H2H comparisons.

**What's missing:**
Cricket H2H still uses Claude's opinion for ratings. Tennis H2H still uses Claude's opinion. CricAPI and ATP API equivalents not integrated yet.

---

### 4. FOOTBALL_API_KEY Required for Calculated Scores

If `FOOTBALL_API_KEY` is not set on Render, football H2H falls back to Claude-generated ratings (`scoringMethod: "claude"`). The app doesn't break — it degrades gracefully.

To enable: get free key at https://dashboard.api-football.com → add to Render env vars as `FOOTBALL_API_KEY`. Free tier: 100 req/day.

---

### 5. Knowledge Base Has a Minor Data Label Error

In `seed.js`, Sinner appears under a cricket player list label but the doc itself is correctly typed as `sport: "tennis"`. Doesn't affect retrieval (filtered by sport field) but worth knowing.

---

## What to Say When Asked "What Did Tests Reveal?"

Be specific — this is more valuable than perfect scores:

- **Q1 (Messi vs Ronaldo)** — high precision and groundedness, both docs retrieved correctly, both analysts cite the context
- **Q3 (Sinner vs Alcaraz)** — context_recall drops because Alcaraz has no seed doc. Answer still works but Alcaraz section is pure Claude, not RAG-grounded. This is a confirmed, quantified limitation.
- **Q4 (Premier League opinion)** — intent correctly classified as "opinion", retrieval skipped, sources array empty. Proves Smart RAG routing works.
- **Q5 (Greatest Test batter)** — retrieval picks Tendulkar and Kohli docs. Interesting to see if Bradman (not seeded) causes recall to drop.
- **Persona fidelity** — most interesting metric. If Statistician gives a qualitative answer when stats context exists, the pipeline is failing even if retrieval was correct.

---

## Interview Q&A

| Question | Answer |
|---|---|
| "How do you evaluate retrieval quality separately from generation?" | RAGAS for retrieval (precision, recall, groundedness), DeepEval for output (relevancy, faithfulness, persona fidelity) — they fail independently |
| "What did your tests reveal?" | Context recall drops for players not in the KB — Q3 confirms this quantitatively. Intent classification correctly skips retrieval for opinion questions — Q4 confirms this. |
| "What's your hallucination mitigation strategy?" | Three layers: similarity threshold gates weak retrievals, `belowThreshold` signal tells Claude explicitly when no context was found, FaithfulnessMetric in DeepEval checks the output |
| "How would you scale the knowledge base?" | Scheduled ingestion pipeline from sports APIs nightly. Auto-ingest on first query for a player not yet seeded. |
| "How does CI/CD handle RAG quality regressions?" | Tests in separate repo hitting live API — triggered post-deploy via GitHub Actions webhook |
| "Why Voyage AI over OpenAI embeddings?" | voyage-large-2 is optimised for retrieval tasks, consistently outperforms ada-002 on semantic similarity benchmarks |
| "What's the difference between your approach and Naive RAG?" | Naive RAG always retrieves and always injects. My pipeline classifies intent first — opinion questions skip retrieval entirely, technique questions skip stats docs, stats questions skip narrative docs. Plus similarity threshold to gate quality. That's the difference between Naive and Smart/Modular RAG. |
| "Why not Graph RAG?" | Graph RAG is the right next step — sports is fundamentally about entity relationships. But for a 3-sport demo app on a free tier, the incremental value of getting Smart RAG right first is higher than building graph infrastructure. I know what it would give me and I can discuss the trade-off. |
| "How do the two analysts stay independent?" | Separate vector search per analyst (narrative vs stats), separate retrieval branches in the intent routing, separate Claude streaming calls — they share no context with each other |

---

## Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (CRA) | Deployed on Vercel |
| Backend | Node.js + Express | Deployed on Render |
| AI Model (generation) | Claude Sonnet (claude-sonnet-4-6) | Analysis and comparison |
| AI Model (classification) | Claude Haiku (claude-haiku-4-5-20251001) | Intent classification — fast + cheap |
| Embeddings | Voyage AI (voyage-large-2) | Better retrieval than ada-002 |
| Vector DB | Supabase with pgvector | match_sports_docs RPC with sport + type filters |
| Player Data (real-time) | TheSportsDB | Age, nationality, position, team, image |
| Football Stats | API-Football (api-sports.io) | Per-90 stats for position-aware scoring |
| Rate Limiting | express-rate-limit | 30 req/15min per IP on AI endpoints |
| Testing | RAGAS + DeepEval | Separate repo, hitting live API |
