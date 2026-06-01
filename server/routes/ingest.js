const express = require("express");
const router = express.Router();
const { storeDocument } = require("../rag");

// POST /api/ingest  — store a single document
router.post("/", async (req, res) => {
  const { content, metadata = {}, sport = "general" } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  try {
    await storeDocument(content, metadata, sport);
    res.json({ success: true, message: "Document ingested" });
  } catch (err) {
    res.status(502).json({ error: "Failed to ingest document", detail: err.message });
  }
});

// POST /api/ingest/bulk  — store multiple documents in one request
router.post("/bulk", async (req, res) => {
  const { documents } = req.body;
  if (!Array.isArray(documents) || !documents.length) {
    return res.status(400).json({ error: "documents array is required" });
  }

  const results = { success: 0, failed: 0, errors: [] };
  for (const doc of documents) {
    try {
      await storeDocument(doc.content, doc.metadata || {}, doc.sport || "general");
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(err.message);
    }
  }
  res.json(results);
});

module.exports = router;
