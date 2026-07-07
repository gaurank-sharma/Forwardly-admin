import bcrypt from "bcryptjs";
import { connectDB } from "./db.js";
import { config } from "./config.js";
import User from "./models/User.js";
import DayConfig from "./models/DayConfig.js";
import { genStrongPassword } from "./services/password.js";

/**
 * Seeds the super-admin, the 3 agents, and a default weekday→pincode→industry
 * plan (Gurgaon-centric example). Safe to re-run (upserts).
 */
async function seed() {
  await connectDB();

  // super admin
  const adminHash = await bcrypt.hash(config.admin.password, 10);
  await User.updateOne(
    { email: config.admin.email },
    { $set: { name: config.admin.name, email: config.admin.email, passwordHash: adminHash, role: "admin", active: true } },
    { upsert: true }
  );

  // agents — created with STRONG unique passwords (printed once)
  const agents = [
    { name: "Gaurank Sharma", email: "gaurank@forwardly.in" },
    { name: "Vikas", email: "vikas@forwardly.in" },
    { name: "Abhinav", email: "abhinav@forwardly.in" },
  ];
  const created = [];
  for (const a of agents) {
    if (await User.findOne({ email: a.email })) continue;
    const pw = genStrongPassword();
    const hash = await bcrypt.hash(pw, 10);
    await User.create({ name: a.name, email: a.email, passwordHash: hash, role: "agent", active: true });
    created.push({ email: a.email, pw });
  }
  if (created.length) {
    console.log("\n[seed] agent credentials (save these):");
    created.forEach((c) => console.log("  " + c.email.padEnd(26) + c.pw));
    console.log("[seed] to (re)set later: npm run passwords\n");
  }

  // weekday plan (0=Sun..6=Sat) — Gurgaon example pincodes
  const plan = [
    { weekday: 1, city: "Gurgaon", pincode: "122001", industry: "Real Estate" },
    { weekday: 2, city: "Gurgaon", pincode: "122002", industry: "Interior Design" },
    { weekday: 3, city: "Gurgaon", pincode: "122003", industry: "Restaurant" },
    { weekday: 4, city: "Gurgaon", pincode: "122018", industry: "Gym" },
    { weekday: 5, city: "Gurgaon", pincode: "122009", industry: "Salon" },
    { weekday: 6, city: "Gurgaon", pincode: "122011", industry: "Clinic" },
  ];
  if ((await DayConfig.countDocuments()) === 0) {
    await DayConfig.insertMany(plan.map((p) => ({ ...p, active: true })));
  }

  console.log("[seed] done. Admin:", config.admin.email, "/", config.admin.password);
  process.exit(0);
}

seed();
