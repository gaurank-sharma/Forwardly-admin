import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import BniLead from "../models/BniLead.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { importBniLeadsFromCsv } from "../services/importBniLeads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultCsvPath = path.join(__dirname, "../scripts/bniScraper/output/bni_leads.csv");

const r = Router();
r.use(auth);
r.use(requireAdmin);

r.get("/", async (req, res) => {
  const { industry, contact, q, chapter, page = 1, limit = 50 } = req.query;
  const query = {};
  if (industry) query.industryKeyword = industry;
  if (chapter) query.memberChapter = chapter;
  if (contact === "yes") query.contactAvailable = true;
  else if (contact === "no") query.contactAvailable = false;
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
  const [total, withContact, byIndustry] = await Promise.all([
    BniLead.countDocuments(),
    BniLead.countDocuments({ contactAvailable: true }),
    BniLead.aggregate([{ $group: { _id: "$industryKeyword", n: { $sum: 1 } } }]),
  ]);
  res.json({
    total,
    withContact,
    byIndustry: Object.fromEntries(byIndustry.map((b) => [b._id || "unknown", b.n])),
  });
});

// re-reads the scraper's CSV output and upserts into Mongo — lets the admin
// pull in whatever the background scrape has written so far, on demand.
r.post("/import", async (req, res) => {
  try {
    const result = await importBniLeadsFromCsv(req.body?.csvPath || defaultCsvPath);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default r;
