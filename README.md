# ⚽ SportIQ — AI Sports Platform

**Live App:** https://sport-iq-git-main-shwetas-projects-fd91a33a.vercel.app/

An AI-powered sports debate platform for Football, Cricket, and Tennis.

## What's Built

- **Dual AI Analysts** — Two Claude-powered personas debate any sports question: The Tactician (technique & style) vs The Statistician (data & numbers)
- **Player Lookup** — Player bio, career stats, and photo pulled from TheSportsDB and Wikipedia
- **Head to Head** — Side-by-side comparison of two players
- **Career Timeline** — Visual milestone journey for any player
- **Search History** — Saved per user via Supabase auth (email/password + Google OAuth)

## RAG Architecture

Each analyst gets their own separate context retrieved from a curated knowledge base — The Tactician and The Statistician never share the same documents.

### Knowledge Base
Two document types are stored, each sourced differently:

- **`narrative` docs** — technique, playing style, biography, tactical context. Sourced from Wikipedia summaries and hand-curated descriptions of how players move, think, and play. These feed **The Tactician**.
- **`stats` docs** — career numbers, records, tournament stats, head-to-head splits. Sourced from verified career statistics across all formats/competitions. These feed **The Statistician**.

Covers top players across Football, Cricket, and Tennis. New players are also auto-ingested from **TheSportsDB** when first looked up.

### How It Works

1. **Embed** — When a question is asked, it is converted into a vector embedding using **Voyage AI** (`voyage-large-2`)
2. **Retrieve (x2)** — Two parallel vector similarity searches run against **Supabase pgvector** (`match_sports_docs` RPC):
   - one filtered to `type: narrative` → context for The Tactician
   - one filtered to `type: stats` → context for The Statistician
3. **Augment** — Each analyst's Claude system prompt is injected with only their relevant context before generating a response, grounding answers in real data

## Data Sources

| Source | Used For |
|---|---|
| Anthropic Claude | AI analyst responses (Tactician & Statistician) |
| Voyage AI | Generating text embeddings for RAG |
| Supabase (pgvector) | Storing and querying vector embeddings |
| TheSportsDB | Player images and sport metadata |
| Wikipedia REST API | Player bio, career summaries, and images |
| DuckDuckGo API | Fallback player image lookup |
