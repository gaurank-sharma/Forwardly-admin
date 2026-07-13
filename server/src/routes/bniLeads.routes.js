import { Router } from "express";
import BniLead from "../models/BniLead.js";
import { config } from "../config.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { importBniLeadsFromCsv, upsertBniLeadRows } from "../services/importBniLeads.js";

const r = Router();

// External-job ingestion (e.g. a deployed scraper/DAG pushing rows directly)
// — protected by a shared secret via ?key= or x-cron-key, same pattern as
// /api/cron/run, since an automated job has no admin JWT to send. Registered
// before the auth/requireAdmin gate below so it bypasses user auth entirely.
// Body: { rows: [ {industry_keyword, user_id, display_name, ...}, ... ] }
// using the same flat field names the scraper's CSV_COLUMNS produce.
r.post("/ingest", async (req, res) => {
  const key = req.query.key || req.headers["x-cron-key"];
  if (!config.bniIngestSecret || key !== config.bniIngestSecret)
    return res.status(401).json({ error: "Unauthorized" });

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows) return res.status(400).json({ error: "Body must be { rows: [...] }" });

  try {
    const result = await upsertBniLeadRows(rows);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

r.use(auth);
r.use(requireAdmin);

function boolParam(v) {
  if (v === "yes") return true;
  if (v === "no") return false;
  return undefined;
}

r.get("/", async (req, res) => {
  const { industry, contact, q, chapter, hasEmail, hasPhone, hasWebsite, nationality, page = 1, limit = 50 } = req.query;
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
  if (q) {
    query.$or = [
      { displayName: new RegExp(q, "i") },
      { companyName: new RegExp(q, "i") },
      { emailAddress: new RegExp(q, "i") },
      { phoneNumber: new RegExp(q, "i") },
    ];
  }

  const lim = Math.min(Number(limit), 200);
  const skip = (Number(page) - 1) * lim;
  const [items, total] = await Promise.all([
    BniLead.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim),
    BniLead.countDocuments(query),
  ]);
  res.json({ items, total, page: Number(page), limit: lim });
});

r.get("/stats", async (req, res) => {
  const [total, withContact, hasEmail, hasPhone, hasWebsite, foreign, byIndustry] = await Promise.all([
    BniLead.countDocuments(),
    BniLead.countDocuments({ contactAvailable: true }),
    BniLead.countDocuments({ hasEmail: true }),
    BniLead.countDocuments({ hasPhone: true }),
    BniLead.countDocuments({ hasWebsite: true }),
    BniLead.countDocuments({ isIndian: false }),
    BniLead.aggregate([{ $group: { _id: "$industryKeyword", n: { $sum: 1 } } }]),
  ]);
  res.json({
    total,
    withContact,
    hasEmail,
    hasPhone,
    hasWebsite,
    indian: total - foreign,
    foreign,
    byIndustry: Object.fromEntries(byIndustry.map((b) => [b._id || "unknown", b.n])),
  });
});

// Distinct industry list actually present in the DB, for the filter dropdown
// — safer than a hardcoded list now that there are 35+ possible keywords.
r.get("/industries", async (req, res) => {
  const industries = await BniLead.distinct("industryKeyword");
  res.json({ industries: industries.filter(Boolean).sort() });
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
