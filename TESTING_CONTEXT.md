# SportIQ — Testing Context & Plan
> Take this file to the testing repo. Everything you need to know about the app, the RAG architecture, and what to test tomorrow.

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
    │                                     ├── retrieveContext(question, sport, "narrative")
    │                                     │       └── Voyage AI embed → Supabase pgvector search
    │                                     │
    │                                     ├── retrieveContext(question, sport, "stats")
    │                                     │       └── Voyage AI embed → Supabase pgvector search
    │                                     │
    │                                     └── Two parallel Claude streams → SSE tokens back to UI
    │
    ├── POST /api/player          ──→ Express → TheSportsDB validate → RAG context → Claude → image
    ├── POST /api/compare         ──→ Express → RAG context → Claude JSON
    └── POST /api/timeline        ──→ Express → Claude JSON
```

---

## The RAG Pipeline (Key Thing to Understand)

This is what makes the app interesting. Two analysts, two separate retrieval pipelines.

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
**Cricket:** Tendulkar, Kohli, Dhoni, Warne, Muralitharan, Bumrah, Sinner (tennis — wrong sport label, worth checking)
**Tennis:** Federer, Nadal, Djokovic, Sinner

### How Retrieval Works
1. Question is embedded via **Voyage AI** (`voyage-large-2` model)
2. `match_sports_docs` RPC runs vector similarity search in Supabase
3. Filtered by `sport` and `type` — so narrative and stats are always separate
4. Top 3 docs returned per analyst
5. Context injected into Claude system prompt before generation
6. Response streams back via SSE

### What the API Returns
`POST /api/analyse/stream` returns SSE events:
```
data: {"type":"sources","tactician":[...],"statistician":[...]}
data: {"type":"tactician","token":"Messi"}
data: {"type":"tactician","token":"'s low"}
data: {"type":"statistician","token":"With 800+"}
...
data: {"type":"done"}
```

---

## What's Been Fixed (Enterprise Readiness)

These were fixed before testing was scoped:

| Issue | Fix |
|---|---|
| API key exposed in browser | Removed — all Claude calls go through Express backend |
| No streaming | SSE streaming on `/api/analyse/stream` |
| No rate limiting | `express-rate-limit` — 30 req/15min per IP on AI endpoints |
| No request logging | Middleware logs method, path, status, duration on every request |
| Inconsistent architecture | PlayerProfile, HeadToHead, Timeline all route through backend |
| Cold starts on Render | Frontend pings `/api/health` on app load to warm up instance |

---

## Testing Plan

### Why Two Frameworks

| Framework | Tests What | Ignores |
|---|---|---|
| **RAGAS** | Retrieval quality — did the right docs come back? | Claude's output quality |
| **DeepEval** | LLM output quality — did Claude use the context well? | Retrieval mechanics |

The story: *"RAGAS tells me my retrieval is working. DeepEval tells me Claude is using it correctly. They can fail independently so I test them separately."*

---

### RAGAS Tests

**What you need per test case:**
```python
{
  "question": "...",
  "answer": "...",          # what Claude actually said
  "contexts": ["...", "..."], # the docs that were retrieved (from sources in API response)
  "ground_truth": "..."     # optional but good for recall
}
```

**Metrics to run:**
- `context_precision` — of retrieved docs, how many were actually relevant?
- `context_recall` — did retrieval find all relevant docs that exist?
- `answer_groundedness` — is the answer supported by retrieved context?

**5 Test Questions (chosen for contrast):**

| # | Question | Sport | Expected RAG Behaviour |
|---|---|---|---|
| 1 | "Who is the better dribbler, Messi or Ronaldo?" | football | Rich context — both in seed |
| 2 | "Is Bumrah the best death bowler ever?" | cricket | Good context — Bumrah in seed |
| 3 | "How does Sinner compare to Alcaraz?" | tennis | Partial — Sinner in seed, Alcaraz not |
| 4 | "Is the Premier League ruining international football?" | football | No player context — opinion question |
| 5 | "Who is the greatest Test batter of all time?" | cricket | Broad — retrieval has to choose between Tendulkar/Kohli |

The contrast in scores across these 5 is the interesting finding. Q1 should score high. Q3 and Q4 should reveal where the pipeline has gaps.

---

### DeepEval Tests

**Same 5 questions. Evaluate the outputs.**

**Metrics to run:**
- `AnswerRelevancyMetric` — does the response address the question?
- `FaithfulnessMetric` — does the response contradict the retrieved context?
- `GEval` custom metric for **persona fidelity**:
  - Statistician: *"Does this response contain at least one specific statistic, number, or record?"*
  - Tactician: *"Does this response reason from technique, style, or tactical concepts rather than statistics?"*

**Why persona fidelity matters:**
The whole point of the dual analyst is that each has a distinct voice and evidence type. If The Statistician gives a qualitative answer, the RAG-to-persona pipeline is failing even if retrieval was correct.

---

### How to Get Test Data from the Live API

Hit the streaming endpoint and collect the full response:

```python
import httpx
import json

API_BASE = "https://sportiq-voxv.onrender.com"

def get_analysis(question, sport):
    """Returns tactician text, statistician text, and sources from the live API."""
    tactician, statistician, sources = "", "", {}

    with httpx.stream("POST", f"{API_BASE}/api/analyse/stream",
                      json={"question": question, "sport": sport},
                      timeout=60) as r:
        for line in r.iter_lines():
            if not line.startswith("data: "):
                continue
            event = json.loads(line[6:])
            if event["type"] == "tactician":
                tactician += event["token"]
            elif event["type"] == "statistician":
                statistician += event["token"]
            elif event["type"] == "sources":
                sources = event

    return {
        "tactician": tactician,
        "statistician": statistician,
        "sources": sources,
        "tactician_contexts": [s["snippet"] for s in sources.get("tactician", [])],
        "statistician_contexts": [s["snippet"] for s in sources.get("statistician", [])]
    }
```

---

## CI/CD Story

**Current state:**
- Push to `main` → Vercel auto-deploys frontend
- Push to `main` → Render auto-deploys backend
- Tests live in a **separate repo** — intentional separation of concerns

**The framing for interview:**
> *"Tests are in a separate repo and hit the deployed API directly. This means I can run evals against production independently of the app deployment cycle — which matters when you want to catch RAG quality regressions without coupling your test pipeline to your app pipeline."*

This is actually a more mature pattern than tests in the same repo.

**Next step (if asked):** GitHub Actions in the test repo that triggers on a schedule or on a webhook from the app repo after successful deploy.

---

## What to Say When Asked "What Did Tests Reveal?"

Be honest and specific — this is more impressive than perfect scores:

- **Q1 (Messi vs Ronaldo)** — high precision and groundedness, both docs retrieved correctly
- **Q3 (Sinner vs Alcaraz)** — context_recall drops because Alcaraz has no seed doc. Answer still works but is pure Claude, not RAG-grounded. This is a known limitation of a static knowledge base.
- **Q4 (Premier League opinion)** — context_precision low (retrieved football docs not directly relevant), but answer_relevancy high because Claude handles opinion questions well without context
- **Persona fidelity** — interesting to see if Statistician ever gives qualitative answers when stats context is empty

---

## Likely Interview Questions from an AI Delivery Manager

| Question | Your Answer |
|---|---|
| "How do you evaluate retrieval quality separately from generation?" | RAGAS for retrieval, DeepEval for output — they fail independently |
| "What did your tests reveal?" | Context recall drops for players not in the knowledge base — confirmed by Q3 scores |
| "How would you scale the knowledge base?" | Current: hand-curated seed.js + TheSportsDB auto-ingest on first lookup. Next: scheduled ingestion pipeline from sports data APIs |
| "What's your hallucination mitigation strategy?" | Faithfulness metric in DeepEval + grounded prompts that tell Claude to use the retrieved context |
| "How does your CI/CD handle RAG quality regressions?" | Tests in separate repo hitting live API — can be triggered post-deploy via GitHub Actions webhook |
| "Why Voyage AI over OpenAI embeddings?" | voyage-large-2 is optimised for retrieval tasks, consistently outperforms ada-002 on semantic similarity benchmarks |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React (CRA), Vercel |
| Backend | Node.js + Express, Render |
| AI Model | Claude Sonnet (claude-sonnet-4-6) |
| Embeddings | Voyage AI (voyage-large-2) |
| Vector DB | Supabase with pgvector extension |
| Auth | Supabase (email + Google OAuth) |
| Player Data | TheSportsDB, Wikipedia REST API, DuckDuckGo |
| Rate Limiting | express-rate-limit |
| Testing | DeepEval + RAGAS (separate repo) |
