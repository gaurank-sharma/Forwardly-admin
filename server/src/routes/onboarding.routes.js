import { Router } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Onboarding from "../models/Onboarding.js";
import Lead from "../models/Lead.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { buildDefaultSections } from "../services/onboardingTemplate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const r = Router();

// ---------------------------------------------------------------------
// Public, token-based routes — the client-facing onboarding page (on the
// Forwardly main site, a different origin) hits these directly, with no
// login. Protected only by possession of the unguessable token (160 bits
// of randomness), same trust model as e.g. a password-reset link — so an
// open CORS policy here is correct and intentional (CORS isn't the
// security boundary for these, the token is), unlike the admin API below.
r.use("/public", cors());

r.get("/public/:token", async (req, res) => {
  const doc = await Onboarding.findOne({ token: req.params.token }).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

// Client submits/edits their answers. Only clientAnswer + uploads are
// writable here — admin-only fields (prefill, PM, status, notes) are not
// touched by this route no matter what the request body contains.
r.patch("/public/:token", async (req, res) => {
  const doc = await Onboarding.findOne({ token: req.params.token });
  if (!doc) return res.status(404).json({ error: "Not found" });

  const incomingSections = req.body?.sections;
  if (Array.isArray(incomingSections)) {
    for (const incoming of incomingSections) {
      const section = doc.sections.find((s) => s.key === incoming.key);
      if (!section) continue;
      for (const iq of incoming.questions || []) {
        const q = section.questions.find((x) => x.key === iq.key);
        if (!q) continue;
        if ("clientAnswer" in iq) q.clientAnswer = iq.clientAnswer;
      }
    }
  }
  if (doc.status === "sent") doc.status = "in_progress";
  await doc.save();
  res.json(doc);
});

r.post("/public/:token/upload", upload.single("file"), async (req, res) => {
  const doc = await Onboarding.findOne({ token: req.params.token });
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (!req.file) return res.status(400).json({ error: "No file" });

  const url = `/uploads/${req.file.filename}`;
  const { sectionKey, questionKey } = req.body;
  const section = doc.sections.find((s) => s.key === sectionKey);
  const q = section?.questions.find((x) => x.key === questionKey);
  if (q) {
    q.uploads.push(url);
    if (doc.status === "sent") doc.status = "in_progress";
    await doc.save();
  }
  res.json({ url });
});

// ---------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------
r.use(auth);

r.get("/", async (req, res) => {
  const items = await Onboarding.find()
    .populate("lead", "name phone city industry")
    .populate("projectManager", "name")
    .sort({ createdAt: -1 })
    .lean();
  res.json(items);
});

r.post("/", requireAdmin, async (req, res) => {
  const { leadId, plan } = req.body;
  if (!leadId || !["9k", "15k"].includes(plan)) {
    return res.status(400).json({ error: "Body must be { leadId, plan: '9k'|'15k' }" });
  }
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const doc = await Onboarding.create({
    lead: lead._id,
    clientName: lead.name,
    plan,
    sections: buildDefaultSections(),
  });
  res.status(201).json(doc);
});

r.get("/:id", async (req, res) => {
  const doc = await Onboarding.findById(req.params.id)
    .populate("lead", "name phone city industry")
    .populate("projectManager", "name")
    .lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

// Admin edits: sections/prefills/plan/PM/status/notes/demoUrl. Full-document
// replace of `sections` is intentional — the admin UI always sends the
// complete edited tree back, simpler than diffing.
r.patch("/:id", async (req, res) => {
  const doc = await Onboarding.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const { sections, plan, projectManager, status, notes, demoUrl } = req.body;
  if (Array.isArray(sections)) doc.sections = sections;
  if (plan) doc.plan = plan;
  if (projectManager !== undefined) doc.projectManager = projectManager || null;
  if (notes !== undefined) doc.notes = notes;
  if (demoUrl !== undefined) doc.demoUrl = demoUrl;
  if (status && status !== doc.status) {
    doc.status = status;
    if (status === "sent" && !doc.sentAt) doc.sentAt = new Date();
    if (status === "completed" && !doc.completedAt) doc.completedAt = new Date();
  }
  await doc.save();
  res.json(doc);
});

r.delete("/:id", requireAdmin, async (req, res) => {
  await Onboarding.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default r;
