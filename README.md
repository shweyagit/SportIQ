# ⚽ SportIQ — AI Sports Platform

A multi-sport AI platform powered by Claude. Supports Football, Cricket and Tennis.

## Features
- **Dual Analyst** — Two AI analysts debate any sports question simultaneously
- **Player Profile** — Career summary, achievements, stats + Wikipedia photo
- **Head to Head** — Compare two players side by side
- **Timeline** — Visual career journey with key milestones

## Setup

### Prerequisites
- Node.js 16+
- Anthropic API key

### Install & Run
```bash
npm install
npm start
```

Opens at http://localhost:3000

### Deploy to Vercel
1. Push to GitHub
2. Go to vercel.com → Import project
3. Deploy — done ✅

## Built With
- React 18
- Claude API (claude-sonnet-4-20250514)
- Wikipedia REST API (player images)

## Notes
- The app uses the Anthropic API directly from the browser via claude.ai artifact support
- For standalone deployment, you'll need to proxy API calls through a backend to protect your API key
