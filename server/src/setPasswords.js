import bcrypt from "bcryptjs";
import { connectDB } from "./db.js";
import User from "./models/User.js";
import { genStrongPassword } from "./services/password.js";

/**
 * Sets a fresh STRONG password for every agent (and the admin if --admin passed)
 * and prints them once. Run: `npm run passwords`  (or `-- --admin`)
 */
async function run() {
  await connectDB();
  const includeAdmin = process.argv.includes("--admin");
  const roles = includeAdmin ? ["agent", "admin"] : ["agent"];
  const users = await User.find({ role: { $in: roles } }).sort({ role: 1, createdAt: 1 });

  console.log("\n=== New credentials (save these — shown once) ===\n");
  for (const u of users) {
    const pw = genStrongPassword();
    u.passwordHash = await bcrypt.hash(pw, 10);
    await u.save();
    console.log(`${u.role.toUpperCase().padEnd(6)}  ${u.email.padEnd(26)}  ${pw}`);
  }
  console.log("\n=================================================\n");
  process.exit(0);
}
run();
