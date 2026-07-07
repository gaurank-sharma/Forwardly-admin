import { Router } from "express";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import IngestRun from "../models/IngestRun.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { runIngest } from "../jobs/ingest.js";
import { ymd, workingDaysThisMonth, WEEKDAYS } from "../services/util.js";

const r = Router();
r.use(auth);

r.get("/overview", async (req, res) => {
  const today = ymd();
  const mine = req.user.role === "admin" ? {} : { assignedTo: req.user._id };

  const [hot, medium, cold, assignedToday, unassignedHot, pendingRecall, won] = await Promise.all([
    Lead.countDocuments({ ...mine, classification: "hot" }),
    Lead.countDocuments({ ...mine, classification: "medium" }),
    Lead.countDocuments({ ...mine, classification: "cold" }),
    Lead.countDocuments({ ...mine, assignedDate: today }),
    Lead.countDocuments({ classification: "hot", assignedTo: null, rejected: false }),
    Lead.countDocuments({ ...mine, needsRecall: true }),
    Lead.countDocuments({ ...mine, status: "won" }),
  ]);

  // active days = distinct assignedDate values (data-driven working days)
  const activeDays = (await Lead.distinct("assignedDate")).filter(Boolean).length;

  const agents = await User.find({ role: "agent" });
  const perAgent = await Promise.all(
    agents.map(async (a) => ({
      id: a._id,
      name: a.name,
      active: a.active,
      today: await Lead.countDocuments({ assignedTo: a._id, assignedDate: today }),
      total: await Lead.countDocuments({ assignedTo: a._id }),
    }))
  );

  const runs = await IngestRun.find().sort({ createdAt: -1 }).limit(7);

  res.json({
    today,
    weekday: WEEKDAYS[new Date().getDay()],
    counts: { hot, medium, cold, assignedToday, unassignedHot, pendingRecall, won },
    workingDaysThisMonth: workingDaysThisMonth(),
    activeDays,
    agents: perAgent,
    recentRuns: runs,
  });
});

// admin: run the nightly job right now
r.post("/ingest", requireAdmin, async (req, res) => {
  try {
    const run = await runIngest({});
    res.json({ ok: true, run });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default r;
