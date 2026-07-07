import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { connectDB } from "./db.js";
import { scheduleCron } from "./jobs/cron.js";

import authRoutes from "./routes/auth.routes.js";
import agentRoutes from "./routes/agents.routes.js";
import configRoutes from "./routes/config.routes.js";
import leadRoutes from "./routes/leads.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import cronRoutes from "./routes/cron.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) =>
  res.json({
    name: "Forwardly Leads API",
    status: "ok",
    endpoints: {
      health: "/api/health",
      login: "POST /api/auth/login",
      cron: "GET /api/cron/run?key=CRON_SECRET",
    },
    note: "This is the backend API. The admin UI runs separately (client on :5173).",
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/config", configRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/cron", cronRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

async function start() {
  await connectDB();
  scheduleCron();
  app.listen(config.port, () => console.log(`[server] http://localhost:${config.port}`));
}
start();
