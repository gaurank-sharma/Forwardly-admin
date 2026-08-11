import { Router } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Onboarding from "../models/Onboarding.js";
import Lead from "../models/Lead.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { buildDefaultSections, buildDefaultProfileFields } from "../services/onboardingTemplate.js";

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

// Client submits/edits their answers. Only clientAnswer fields (and derived
// selections like imagesToChange) are writable here — admin-only fields
// (adminPrefill, PM, status, notes, imageCount) are not touched by this
// route no matter what the request body contains.
r.patch("/public/:token", async (req, res) => {
  const doc = await Onboarding.findOne({ token: req.params.token });
  if (!doc) return res.status(404).json({ error: "Not found" });

  const { profileFields, likesDemo, demoFeedback, sections } = req.body || {};

  if (Array.isArray(profileFields)) {
    for (const incoming of profileFields) {
      const f = doc.profileFields.find((x) => x.key === incoming.key);
      if (f && "clientAnswer" in incoming) f.clientAnswer = incoming.clientAnswer;
    }
  }
  if (likesDemo && "clientAnswer" in likesDemo) doc.likesDemo.clientAnswer = likesDemo.clientAnswer;
  if (demoFeedback && "clientAnswer" in demoFeedback) doc.demoFeedback.clientAnswer = demoFeedback.clientAnswer;

  if (Array.isArray(sections)) {
    for (const incoming of sections) {
      const s = doc.sections.find((x) => x.key === incoming.key);
      if (!s) continue;
      if (incoming.keepAsIs && "clientAnswer" in incoming.keepAsIs) s.keepAsIs.clientAnswer = incoming.keepAsIs.clientAnswer;
      if (incoming.changeImages && "clientAnswer" in incoming.changeImages) s.changeImages.clientAnswer = incoming.changeImages.clientAnswer;
      if (incoming.contentChanges && "clientAnswer" in incoming.contentChanges) s.contentChanges.clientAnswer = incoming.contentChanges.clientAnswer;
      if (Array.isArray(incoming.imagesToChange)) {
        s.imagesToChange = incoming.imagesToChange
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= s.imageCount);
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
  const { sectionKey, imageIndex } = req.body;
  const index = Number(imageIndex);
  const section = doc.sections.find((s) => s.key === sectionKey);
  if (section && Number.isInteger(index) && index >= 1 && index <= section.imageCount) {
    const existing = section.imageUploads.find((u) => u.index === index);
    if (existing) existing.url = url;
    else section.imageUploads.push({ index, url });
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
    profileFields: buildDefaultProfileFields(lead),
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

// Admin edits: profileFields/likesDemo/sections/prefills/plan/PM/status/
// notes/demoUrl. Full-document replace of profileFields/sections is
// intentional — the admin UI always sends the complete edited tree back,
// simpler than diffing.
r.patch("/:id", async (req, res) => {
  const doc = await Onboarding.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const { profileFields, likesDemo, demoFeedback, sections, plan, projectManager, status, notes, demoUrl } = req.body;
  if (Array.isArray(profileFields)) doc.profileFields = profileFields;
  if (likesDemo) doc.likesDemo = { ...doc.likesDemo.toObject?.() ?? doc.likesDemo, ...likesDemo };
  if (demoFeedback) doc.demoFeedback = { ...doc.demoFeedback.toObject?.() ?? doc.demoFeedback, ...demoFeedback };
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
