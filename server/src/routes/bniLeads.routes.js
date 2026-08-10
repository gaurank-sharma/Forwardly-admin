import { Router } from "express";
import BniLead from "../models/BniLead.js";
import BniLeadOld from "../models/BniLeadOld.js";
import ScrapeProgress from "../models/ScrapeProgress.js";
import { config } from "../config.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { importBniLeadsFromCsv, upsertBniLeadRows } from "../services/importBniLeads.js";

const r = Router();

// db1 = the original cluster (everything scraped before it filled up —
// real estate/interior designer/construction here is a frozen snapshot as
// of the migration; the other 32 industries only ever lived here).
// db2 = the dedicated cluster real estate/interior designer/construction
// actively grow on now. "all" shows both, tagged by source — note that for
// the 3 migrated industries this means the same person can appear twice
// (once as the frozen db1 snapshot, once as the live db2 copy); that's
// intentional transparency, not a bug, since db1 is otherwise untouched
// history and not something to silently hide or dedupe away.
function modelsForSource(source) {
  if (source === "db1") return [["db1", BniLeadOld]];
  if (source === "db2") return [["db2", BniLead]];
  return [["db1", BniLeadOld], ["db2", BniLead]];
}

function requireIngestSecret(req, res, next) {
  const key = req.query.key || req.headers["x-cron-key"];
  if (!config.bniIngestSecret || key !== config.bniIngestSecret)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// External-job ingestion (e.g. a deployed scraper/DAG pushing rows directly)
// — protected by a shared secret, same pattern as /api/cron/run, since an
// automated job has no admin JWT to send. Registered before the
// auth/requireAdmin gate below so these bypass user auth entirely.
// Body: { rows: [ {industry_keyword, user_id, display_name, ...}, ... ] }
// using the same flat field names the scraper's CSV_COLUMNS produce.
r.post("/ingest", requireIngestSecret, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows) return res.status(400).json({ error: "Body must be { rows: [...] }" });

  try {
    const result = await upsertBniLeadRows(rows);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Scrape progress (per-industry nextPage/done), stored here instead of the
// scraper's own local disk — that disk isn't guaranteed to survive a
// redeploy of the scraper's hosting, so relying on it meant every deploy
// reset progress back to page 1. This database survives regardless.
r.get("/scrape-progress", requireIngestSecret, async (req, res) => {
  const doc = await ScrapeProgress.findOne({ key: "bni-scraper" }).lean();
  res.json({ industries: doc?.industries || {} });
});

r.post("/scrape-progress", requireIngestSecret, async (req, res) => {
  const industries = req.body?.industries;
  if (!industries || typeof industries !== "object") {
    return res.status(400).json({ error: "Body must be { industries: {...} }" });
  }
  await ScrapeProgress.updateOne({ key: "bni-scraper" }, { $set: { industries } }, { upsert: true });
  res.json({ ok: true });
});

// All user_ids already stored — lets the scraper dedupe against everything
// ever found (across every deploy/machine that's ever run it), not just
// whatever a single instance happened to process locally.
r.get("/known-user-ids", requireIngestSecret, async (req, res) => {
  const ids = await BniLead.distinct("userId");
  res.json({ userIds: ids });
});

r.use(auth);
r.use(requireAdmin);

function boolParam(v) {
  if (v === "yes") return true;
  if (v === "no") return false;
  return undefined;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

r.get("/", async (req, res) => {
  const {
    industry, contact, chapter, hasEmail, hasPhone, hasWebsite, nationality,
    phone, email, company, source = "all",
    page = 1, limit = 50,
  } = req.query;
  const query = {};
  if (industry) query.industryKeyword = industry;
  if (chapter) query.memberChapter = chapter;
  if (contact === "yes") query.contactAvailable = true;
  else if (contact === "no") query.contactAvailable = false;
  if (boolParam(hasEmail) !== undefined) query.hasEmail = boolParam(hasEmail);
  if (boolParam(hasPhone) !== undefined) query.hasPhone = boolParam(hasPhone);
  if (boolParam(hasWebsite) !== undefined) query.hasWebsite = boolParam(hasWebsite);
  if (nationality === "indian") query.isIndian = true;
  else if (nationality === "foreign") query.isIndian = false;

  // Three targeted, indexed searches instead of one generic regex $or across
  // 4 text columns — that becomes a full collection scan once this crosses
  // tens of thousands of rows. Each of these uses a real index:
  //   - phone: anchored prefix against a digits-only multikey array index
  //   - email: anchored prefix against a lowercased indexed field
  //   - company: MongoDB text index (word-based, matches anywhere, indexed)
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits) query.phoneDigits = { $regex: "^" + escapeRegex(digits) };
  }
  if (email) {
    query.emailLower = { $regex: "^" + escapeRegex(email.trim().toLowerCase()) };
  }
  if (company) {
    query.$text = { $search: company };
  }

  const lim = Math.min(Number(limit), 200);
  const skip = (Number(page) - 1) * lim;

  // A text search should rank by relevance, not insertion date, or the
  // best match can end up buried on page 3.
  const projection = company ? { score: { $meta: "textScore" } } : null;
  const sort = company ? { score: { $meta: "textScore" } } : { createdAt: -1 };

  // Cross-cluster pagination has no single sorted cursor, so each source is
  // asked for its own top (skip+lim) matches, tagged, merged, re-sorted,
  // then sliced to the requested page. Correct for the page depths an admin
  // dashboard actually gets used at; re-fetches skip+lim per source rather
  // than true offset pagination, which would need a cross-cluster $lookup
  // MongoDB doesn't support — an acceptable tradeoff here, not a mistake.
  const targets = modelsForSource(source);
  const perSource = await Promise.all(
    targets.map(async ([tag, Model]) => {
      const [docs, count] = await Promise.all([
        Model.find(query, projection).sort(sort).limit(skip + lim).lean(),
        Model.countDocuments(query),
      ]);
      return { tag, docs: docs.map((d) => ({ ...d, source: tag })), count };
    })
  );

  const total = perSource.reduce((sum, s) => sum + s.count, 0);
  const merged = perSource.flatMap((s) => s.docs);
  merged.sort((a, b) =>
    company ? (b.score || 0) - (a.score || 0) : new Date(b.createdAt) - new Date(a.createdAt)
  );
  const items = merged.slice(skip, skip + lim);

  res.json({ items, total, page: Number(page), limit: lim });
});

r.get("/stats", async (req, res) => {
  const { source = "all" } = req.query;
  const targets = modelsForSource(source);

  const perSource = await Promise.all(
    targets.map(async ([tag, Model]) => {
      const [total, withContact, hasEmail, hasPhone, hasWebsite, foreign, byIndustry] = await Promise.all([
        Model.countDocuments(),
        Model.countDocuments({ contactAvailable: true }),
        Model.countDocuments({ hasEmail: true }),
        Model.countDocuments({ hasPhone: true }),
        Model.countDocuments({ hasWebsite: true }),
        Model.countDocuments({ isIndian: false }),
        Model.aggregate([{ $group: { _id: "$industryKeyword", n: { $sum: 1 } } }]),
      ]);
      return { tag, total, withContact, hasEmail, hasPhone, hasWebsite, foreign, byIndustry };
    })
  );

  const sum = (key) => perSource.reduce((s, p) => s + p[key], 0);
  const byIndustry = {};
  for (const p of perSource) {
    for (const b of p.byIndustry) byIndustry[b._id || "unknown"] = (byIndustry[b._id || "unknown"] || 0) + b.n;
  }

  res.json({
    total: sum("total"),
    withContact: sum("withContact"),
    hasEmail: sum("hasEmail"),
    hasPhone: sum("hasPhone"),
    hasWebsite: sum("hasWebsite"),
    indian: sum("total") - sum("foreign"),
    foreign: sum("foreign"),
    byIndustry,
    bySource: Object.fromEntries(perSource.map((p) => [p.tag, p.total])),
  });
});

// Distinct industry list actually present across whichever source(s) are in
// scope, for the filter dropdown.
r.get("/industries", async (req, res) => {
  const { source = "all" } = req.query;
  const targets = modelsForSource(source);
  const lists = await Promise.all(targets.map(([, Model]) => Model.distinct("industryKeyword")));
  const industries = [...new Set(lists.flat())].filter(Boolean).sort();
  res.json({ industries });
});

// Manual fallback: re-reads a CSV export (e.g. from the scraper repo's
// output/bni_leads.csv) and upserts into Mongo. Not the primary data path
// anymore — the scraper pushes leads live via POST /ingest above.
r.post("/import", async (req, res) => {
  if (!req.body?.csvPath) return res.status(400).json({ error: "Body must be { csvPath: '...' }" });
  try {
    const result = await importBniLeadsFromCsv(req.body.csvPath);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default r;
