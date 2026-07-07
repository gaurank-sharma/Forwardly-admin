import { Router } from "express";
import { config } from "../config.js";
import { runIngest } from "../jobs/ingest.js";

/**
 * External-scheduler trigger (Vercel Cron / Render Cron / cron-job.org / GH
 * Actions). Protect with CRON_SECRET via ?key= or `x-cron-key` header.
 * Example: GET /api/cron/run?key=YOUR_SECRET
 */
const r = Router();

r.get("/run", async (req, res) => {
  const key = req.query.key || req.headers["x-cron-key"];
  if (!config.cronSecret || key !== config.cronSecret)
    return res.status(401).json({ error: "Unauthorized" });
  try {
    const run = await runIngest({});
    res.json({ ok: true, date: run.date, fetched: run.fetched, hot: run.hot, assigned: run.assigned });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default r;
