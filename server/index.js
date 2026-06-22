require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();
app.set("trust proxy", 1); // required on Render/Heroku — reads real client IP from X-Forwarded-For
app.use(cors());
app.use(express.json());

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ── Rate limiting (30 req / 15 min per IP on AI endpoints) ───────────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again in a few minutes." }
});

// ── Swagger UI ────────────────────────────────────────────────────────────────
const swaggerDoc = YAML.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: ".swagger-ui .topbar { background: #080808 } .swagger-ui .topbar-wrapper img { display:none }",
  customSiteTitle: "SportIQ API Docs"
}));

// ── Serve raw swagger spec for Postman import ─────────────────────────────────
app.get("/swagger.json", (req, res) => res.json(swaggerDoc));

// ── Serve Postman collection for direct URL import ────────────────────────────
app.get("/postman-collection", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.sendFile(path.join(__dirname, "SportIQ.postman_collection.json"));
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/analyse",  aiLimiter, require("./routes/analyse"));
app.use("/api/player",   aiLimiter, require("./routes/player"));
app.use("/api/compare",  aiLimiter, require("./routes/compare"));
app.use("/api/timeline", aiLimiter, require("./routes/timeline"));
app.use("/api/history",  require("./routes/history"));
app.use("/api/ingest",   require("./routes/ingest"));
app.use("/api/scrape",   require("./routes/scrape"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "SportIQ API", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

const PORT = process.env.PORT || process.env.API_PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 SportIQ API running at http://localhost:${PORT}`);
  console.log(`📖 Swagger docs at  http://localhost:${PORT}/api-docs\n`);
});
