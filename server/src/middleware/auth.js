import jwt from "jsonwebtoken";
import { config } from "../config.js";
import User from "../models/User.js";

export function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
}

export async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  // accept token via header OR ?token= (for direct file/PDF links opened in a tab)
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token || null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}
