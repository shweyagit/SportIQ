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

Analyst responses are grounded in a curated knowledge base using Retrieval-Augmented Generation (RAG):

1. **Knowledge Base** — Hand-curated documents covering technique, style, stats, and career data for top players across Football, Cricket, and Tennis. Two document types:
   - `narrative` — technique, biography, tactical context (feeds The Tactician)
   - `stats` — career numbers, records, splits (feeds The Statistician)

2. **Embeddings** — Each document is embedded using **Voyage AI** (`voyage-large-2` model) and stored in **Supabase** with the `pgvector` extension

3. **Retrieval** — When a question is asked, it is embedded and a vector similarity search (`match_sports_docs` RPC) retrieves the top 3 most relevant documents, filtered by sport

4. **Augmented Prompt** — Retrieved context is injected into the Claude system prompt before the analysts respond, grounding answers in real data rather than hallucination

## Data Sources

| Source | Used For |
|---|---|
| Anthropic Claude | AI analyst responses (Tactician & Statistician) |
| Voyage AI | Generating text embeddings for RAG |
| Supabase (pgvector) | Storing and querying vector embeddings |
| TheSportsDB | Player images and sport metadata |
| Wikipedia REST API | Player bio, career summaries, and images |
| DuckDuckGo API | Fallback player image lookup |
