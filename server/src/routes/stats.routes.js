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
  const count = (extra) => [{ $match: { ...mine, ...extra } }, { $count: "n" }];

  // one round trip for all the scoped counts (was 7 sequential-ish queries)
  const [facetRes, activeDates, agents, perAgentAgg, runs] = await Promise.all([
    Lead.aggregate([
      {
        $facet: {
          hot: count({ classification: "hot" }),
          medium: count({ classification: "medium" }),
          cold: count({ classification: "cold" }),
          assignedToday: count({ assignedDate: today }),
          unassignedHot: [{ $match: { classification: "hot", assignedTo: null, rejected: false } }, { $count: "n" }],
          pendingRecall: count({ needsRecall: true }),
          won: count({ status: "won" }),
        },
      },
    ]),
    Lead.distinct("assignedDate"),
    User.find({ role: "agent" }).sort({ createdAt: 1 }),
    // per-agent today/total counts in a single grouped query (was 2 queries x N agents)
    Lead.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          today: { $sum: { $cond: [{ $eq: ["$assignedDate", today] }, 1, 0] } },
        },
      },
    ]),
    IngestRun.find().sort({ createdAt: -1 }).limit(7),
  ]);

  const n = (arr) => arr?.[0]?.n || 0;
  const f = facetRes[0] || {};
  const counts = {
    hot: n(f.hot),
    medium: n(f.medium),
    cold: n(f.cold),
    assignedToday: n(f.assignedToday),
    unassignedHot: n(f.unassignedHot),
    pendingRecall: n(f.pendingRecall),
    won: n(f.won),
  };

  const activeDays = activeDates.filter(Boolean).length;

  const byAgent = new Map(perAgentAgg.map((p) => [String(p._id), p]));
  const perAgent = agents.map((a) => ({
    id: a._id,
    name: a.name,
    active: a.active,
    today: byAgent.get(String(a._id))?.today || 0,
    total: byAgent.get(String(a._id))?.total || 0,
  }));

  res.json({
    today,
    weekday: WEEKDAYS[new Date().getDay()],
    counts,
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
