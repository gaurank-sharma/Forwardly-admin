import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { ymd } from "../services/util.js";

const r = Router();
r.use(auth);

// list agents with today's load + on/off status
r.get("/", async (req, res) => {
  const today = ymd();
  const agents = await User.find({ role: "agent" }).sort({ createdAt: 1 });
  const out = await Promise.all(
    agents.map(async (a) => {
      const assignedToday = await Lead.countDocuments({ assignedTo: a._id, assignedDate: today });
      const totalAssigned = await Lead.countDocuments({ assignedTo: a._id });
      return { ...a.toSafe(), assignedToday, totalAssigned };
    })
  );
  res.json(out);
});

// toggle / set on-off (agent can toggle self; admin can toggle anyone)
r.patch("/:id/active", async (req, res) => {
  const target = req.params.id;
  if (req.user.role !== "admin" && String(req.user._id) !== target)
    return res.status(403).json({ error: "Not allowed" });
  const user = await User.findByIdAndUpdate(
    target,
    { active: Boolean(req.body.active) },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user.toSafe());
});

// admin: create agent
r.post("/", requireAdmin, async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ error: "Email exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, phone, role: "agent" });
  res.status(201).json(user.toSafe());
});

export default r;
