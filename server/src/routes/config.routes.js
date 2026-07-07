import { Router } from "express";
import DayConfig from "../models/DayConfig.js";
import { auth, requireAdmin } from "../middleware/auth.js";

const r = Router();
r.use(auth);

r.get("/", async (req, res) => {
  const items = await DayConfig.find().sort({ weekday: 1, createdAt: 1 });
  res.json(items);
});

r.post("/", requireAdmin, async (req, res) => {
  const { weekday, city, pincode, industry, keyword, active } = req.body || {};
  if (weekday == null || !pincode || !industry)
    return res.status(400).json({ error: "weekday, pincode, industry required" });
  const item = await DayConfig.create({ weekday, city, pincode, industry, keyword, active });
  res.status(201).json(item);
});

r.patch("/:id", requireAdmin, async (req, res) => {
  const item = await DayConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

r.delete("/:id", requireAdmin, async (req, res) => {
  await DayConfig.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default r;
