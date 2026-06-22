/**
 * scraper.js
 *
 * Scrapes BBC Sport RSS feeds for football, cricket, and tennis.
 * Chunks articles by paragraph and ingests into the RAG knowledge base.
 *
 * This is what makes the RAG genuinely useful — real fresh content
 * Claude cannot know from training data.
 */

const RSSParser = require("rss-parser");
const { storeDocument } = require("../rag");

const parser = new RSSParser({
  timeout: 10000,
  headers: { "User-Agent": "SportIQ/1.0 (sports research platform)" },
});

// ── RSS feeds per sport ───────────────────────────────────────────────────────

const FEEDS = {
  football: [
    { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "bbc_sport" },
    { url: "https://www.skysports.com/rss/12040",              source: "sky_sports"  },
  ],
  cricket: [
    { url: "https://feeds.bbci.co.uk/sport/cricket/rss.xml",  source: "bbc_sport"   },
    { url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", source: "espn_cricinfo" },
  ],
  tennis: [
    { url: "https://feeds.bbci.co.uk/sport/tennis/rss.xml",   source: "bbc_sport"   },
  ],
};

// ── Chunk text into ~150 word paragraphs ─────────────────────────────────────

function chunkText(text, minWords = 40, maxWords = 200) {
  // Split on double newlines or sentence boundaries
  const rawChunks = text
    .split(/\n\n+/)
    .map(p => p.replace(/\s+/g, " ").trim())
    .filter(p => p.length > 0);

  const chunks = [];
  let current = "";

  for (const para of rawChunks) {
    const wordCount = (current + " " + para).trim().split(/\s+/).length;

    if (wordCount > maxWords && current) {
      // Current chunk is full — save and start new
      if (current.split(/\s+/).length >= minWords) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + " " + para : para;
    }
  }

  if (current && current.split(/\s+/).length >= minWords) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ── Detect document type from content ────────────────────────────────────────

function detectType(text) {
  const statsKeywords = /\b(\d+[\.\d]* (runs|goals|wickets|aces|assists|points)|average|strike rate|economy|per 90|xG|hat.trick|century|centuries|record)\b/i;
  return statsKeywords.test(text) ? "stats" : "narrative";
}

// ── Scrape one feed ───────────────────────────────────────────────────────────

async function scrapeFeed(feedUrl, sport, source, limit = 5) {
  const results = { ingested: 0, skipped: 0, errors: [] };

  try {
    const feed = await parser.parseURL(feedUrl);
    const items = feed.items.slice(0, limit);

    for (const item of items) {
      try {
        // Build text from title + summary/content
        const raw = [
          item.title || "",
          item.contentSnippet || item.content || item.summary || "",
        ].join("\n\n").trim();

        if (!raw || raw.split(/\s+/).length < 40) {
          results.skipped++;
          continue;
        }

        const chunks = chunkText(raw);

        for (const chunk of chunks) {
          const type = detectType(chunk);
          await storeDocument(chunk, {
            type,
            source,
            sport,
            url:         item.link   || "",
            title:       item.title  || "",
            publishedAt: item.pubDate || new Date().toISOString(),
          }, sport);
        }

        console.log(`  [SCRAPE] ✓ "${(item.title || "").slice(0, 60)}" → ${chunks.length} chunk(s)`);
        results.ingested++;
      } catch (err) {
        results.errors.push(`"${item.title}": ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Feed ${feedUrl}: ${err.message}`);
  }

  return results;
}

// ── Main scrape function ──────────────────────────────────────────────────────

async function scrapeAll(sports = ["football", "cricket", "tennis"], articlesPerFeed = 5) {
  const summary = { total_ingested: 0, total_skipped: 0, errors: [] };

  for (const sport of sports) {
    const feeds = FEEDS[sport] || [];
    console.log(`\n[SCRAPE] ${sport.toUpperCase()} — ${feeds.length} feed(s)`);

    for (const feed of feeds) {
      const result = await scrapeFeed(feed.url, sport, feed.source, articlesPerFeed);
      summary.total_ingested += result.ingested;
      summary.total_skipped  += result.skipped;
      summary.errors.push(...result.errors);
    }
  }

  return summary;
}

module.exports = { scrapeAll, scrapeFeed, chunkText };
