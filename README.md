# ⚽ SportIQ — AI Sports Platform

**Live App:** https://sport-iq-git-main-shwetas-projects-fd91a33a.vercel.app/

A multi-sport AI platform powered by Claude. Supports Football, Cricket and Tennis.

## Features
- **Dual Analyst** — Two AI analysts debate any sports question simultaneously
- **Player Profile** — Career summary, achievements, stats + Wikipedia photo
- **Head to Head** — Compare two players side by side
- **Timeline** — Visual career journey with key milestones
- **RAG Architecture** — Supabase pgvector + Voyage AI for context-aware responses
- **Auth** — Email/password and Google OAuth via Supabase

## URLs

| Service | URL |
|---|---|
| Frontend | https://sport-iq-git-main-shwetas-projects-fd91a33a.vercel.app/ |
| Backend API | https://sportiq-voxv.onrender.com |
| API Docs | https://sportiq-voxv.onrender.com/api-docs |

## Setup

### Prerequisites
- Node.js 16+
- Anthropic API key
- Supabase project
- Voyage AI key

### Frontend
```bash
npm install
npm start
```

Opens at http://localhost:3000

### Backend
```bash
cd server
npm install
npm run dev
```

Runs at http://localhost:4000

### Environment Variables

**Frontend (`.env`):**
```
REACT_APP_ANTHROPIC_KEY=
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_API_URL=http://localhost:4000
```

**Backend (`server/.env`):**
```
ANTHROPIC_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
VOYAGE_API_KEY=
```

## Built With
- React 18
- Claude API (claude-sonnet-4-6)
- Node.js + Express
- Supabase (PostgreSQL + pgvector)
- Voyage AI (embeddings)
- Wikipedia REST API & TheSportsDB (player data)
- Vercel (frontend) + Render (backend)
