require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ── Swagger UI ────────────────────────────────────────────────────────────────
const swaggerDoc = YAML.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: ".swagger-ui .topbar { background: #080808 } .swagger-ui .topbar-wrapper img { display:none }",
  customSiteTitle: "SportIQ API Docs"
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/analyse",  require("./routes/analyse"));
app.use("/api/player",   require("./routes/player"));
app.use("/api/compare",  require("./routes/compare"));
app.use("/api/timeline", require("./routes/timeline"));
app.use("/api/history",  require("./routes/history"));

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

const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 SportIQ API running at http://localhost:${PORT}`);
  console.log(`📖 Swagger docs at  http://localhost:${PORT}/api-docs\n`);
});
