import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { generateResearch } from "../services/research.js";
import { streamReport } from "../services/pdf.js";
import { streamProposal } from "../services/proposal.js";
import { ymd } from "../services/util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const r = Router();
r.use(auth);

// scope: agents only see their own assigned leads
function scopeFor(req, base = {}) {
  if (req.user.role === "admin") return base;
  return { ...base, assignedTo: req.user._id };
}

// LIST with filters
r.get("/", async (req, res) => {
  const { classification, status, assigned, q, pincode, industry, page = 1, limit = 50 } = req.query;
  const query = scopeFor(req);
  if (classification) query.classification = classification;
  if (status) query.status = status;
  if (pincode) query.pincode = pincode;
  if (industry) query.industry = industry;
  if (assigned === "unassigned") query.assignedTo = null;
  else if (assigned === "me") query.assignedTo = req.user._id;
  else if (assigned && assigned !== "all") query.assignedTo = assigned;
  if (q) query.$or = [
    { name: new RegExp(q, "i") },
    { phone: new RegExp(q, "i") },
    { address: new RegExp(q, "i") },
  ];

  const lim = Math.min(Number(limit), 200);
  const skip = (Number(page) - 1) * lim;
  const [items, total] = await Promise.all([
    Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("assignedTo", "name"),
    Lead.countDocuments(query),
  ]);
  res.json({ items, total, page: Number(page), limit: lim });
});

r.get("/:id", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id })).populate("assignedTo", "name");
  if (!lead) return res.status(404).json({ error: "Not found" });
  res.json(lead);
});

// on-demand PDF pitch report (generated live from DB — no stored files).
// opened directly in a tab, so token is passed via ?token= (see auth middleware)
r.get("/:id/report.pdf", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).send("Not found");
  if (!lead.research?.summary) {
    lead.research = generateResearch(lead);
    await lead.save();
  }
  streamReport(lead, res);
});

// on-demand sales proposal PDF (pricing/package doc) — available for any lead,
// generated fresh each time so the client's name is always correct.
r.get("/:id/proposal.pdf", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).send("Not found");
  streamProposal(lead, res);
});

// CRM update: status / reason / response / recall
r.patch("/:id", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).json({ error: "Not found" });
  const { status, lastReason, lastResponse, needsRecall, recallAt } = req.body || {};
  if (status) lead.status = status;
  if (lastReason !== undefined) lead.lastReason = lastReason;
  if (lastResponse !== undefined) lead.lastResponse = lastResponse;
  if (needsRecall !== undefined) lead.needsRecall = Boolean(needsRecall);
  if (recallAt !== undefined) lead.recallAt = recallAt ? new Date(recallAt) : null;
  lead.activities.push({
    at: new Date(), by: req.user._id, byName: req.user.name, type: "status",
    note: `${status ? "Status → " + status + ". " : ""}${lastResponse ? "Response: " + lastResponse : ""}`.trim(),
  });
  await lead.save();
  res.json(lead);
});

// log a call
r.post("/:id/call", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).json({ error: "Not found" });
  const { outcome, note } = req.body || {};
  if (lead.status === "assigned") lead.status = "contacted";
  lead.activities.push({
    at: new Date(), by: req.user._id, byName: req.user.name, type: "call",
    note: `Call — ${outcome || "logged"}${note ? ": " + note : ""}`,
  });
  await lead.save();
  res.json(lead);
});

// reject (simple = quick no / proper = with reason)
r.post("/:id/reject", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).json({ error: "Not found" });
  const { type = "simple", reason = "" } = req.body || {};
  lead.rejected = true;
  lead.rejectType = type === "proper" ? "proper" : "simple";
  lead.rejectReason = reason;
  lead.status = "rejected";
  lead.activities.push({
    at: new Date(), by: req.user._id, byName: req.user.name, type: "reject",
    note: `Rejected (${lead.rejectType})${reason ? ": " + reason : ""}`,
  });
  await lead.save();
  res.json(lead);
});

r.post("/:id/reopen", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).json({ error: "Not found" });
  lead.rejected = false;
  lead.rejectType = "";
  lead.rejectReason = "";
  lead.status = lead.assignedTo ? "assigned" : "new";
  await lead.save();
  res.json(lead);
});

// attachment (proof)
r.post("/:id/attachment", upload.single("file"), async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).json({ error: "Not found" });
  if (!req.file) return res.status(400).json({ error: "No file" });
  const att = { url: `/uploads/${req.file.filename}`, name: req.file.originalname, uploadedAt: new Date() };
  lead.attachments.push(att);
  lead.activities.push({
    at: new Date(), by: req.user._id, byName: req.user.name, type: "attachment",
    note: `Attached ${req.file.originalname}`,
  });
  await lead.save();
  res.json(lead);
});

// regenerate research/pitch
r.post("/:id/research", async (req, res) => {
  const lead = await Lead.findOne(scopeFor(req, { _id: req.params.id }));
  if (!lead) return res.status(404).json({ error: "Not found" });
  lead.research = generateResearch(lead);
  await lead.save();
  res.json(lead);
});

// admin: manual (re)assign
r.post("/:id/assign", requireAdmin, async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Not found" });
  const agent = await User.findOne({ _id: req.body.agentId, role: "agent" });
  if (!agent) return res.status(400).json({ error: "Invalid agent" });
  lead.assignedTo = agent._id;
  lead.assignedToName = agent.name;
  lead.assignedAt = new Date();
  lead.assignedDate = ymd();
  if (lead.status === "new") lead.status = "assigned";
  lead.activities.push({ at: new Date(), by: req.user._id, byName: req.user.name, type: "assign", note: `Manually assigned to ${agent.name}` });
  await lead.save();
  res.json(lead);
});

export default r;
