/**
 * POST /api/scrape        — trigger scrape manually
 * GET  /api/scrape/status — last scrape summary
 */

const express = require("express");
const router  = express.Router();
const { scrapeAll } = require("../services/scraper");

let lastRun = null; // in-memory status

// POST /api/scrape
router.post("/", async (req, res) => {
  const { sports = ["football", "cricket", "tennis"], articlesPerFeed = 5 } = req.body;

  console.log(`\n[SCRAPE] Manual trigger — sports: ${sports.join(", ")}`);
  const start = Date.now();

  try {
    const summary = await scrapeAll(sports, articlesPerFeed);
    lastRun = {
      timestamp:       new Date().toISOString(),
      durationMs:      Date.now() - start,
      sports,
      articlesPerFeed,
      ...summary,
    };
    console.log(`[SCRAPE] Done — ${summary.total_ingested} articles ingested in ${Date.now() - start}ms`);
    res.json({ success: true, ...lastRun });
  } catch (err) {
    res.status(502).json({ error: "Scrape failed", detail: err.message });
  }
});

// GET /api/scrape/status
router.get("/status", (req, res) => {
  if (!lastRun) return res.json({ status: "never_run" });
  res.json({ status: "ok", lastRun });
});

module.exports = router;
