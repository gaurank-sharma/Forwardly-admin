import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sign, auth } from "../middleware/auth.js";

const r = Router();

r.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ token: sign(user), user: user.toSafe() });
});

r.get("/me", auth, (req, res) => res.json({ user: req.user.toSafe() }));

export default r;
