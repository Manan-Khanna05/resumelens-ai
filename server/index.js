const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { analyse } = require("./analyze");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "500kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "resumelens-ai",
    method: "on-device, rule-based — no external API",
    time: new Date().toISOString(),
  });
});

app.post("/api/analyze", (req, res) => {
  const { resume, jobDescription } = req.body || {};
  if (typeof resume !== "string" || typeof jobDescription !== "string") {
    return res.status(400).json({ error: "resume and jobDescription must both be strings." });
  }
  if (resume.trim().length < 50) {
    return res.status(400).json({ error: "Resume text is too short — paste at least 50 characters." });
  }
  if (jobDescription.trim().length < 50) {
    return res.status(400).json({ error: "Job description is too short — paste at least 50 characters." });
  }
  try {
    const result = analyse(resume, jobDescription);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Analysis failed." });
  }
});

// In production, serve the built frontend from dist/.
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => {
  console.log(`ResumeLens AI server listening on http://localhost:${PORT}`);
  console.log(`API: POST /api/analyze, GET /api/health`);
});
