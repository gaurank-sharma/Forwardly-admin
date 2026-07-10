import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import Lead from "../models/Lead.js";
import { generateResearch } from "../services/research.js";

/**
 * One-off: regenerate research/pitch (English + Hinglish) for every lead
 * already stored in the DB, using the current research.js template.
 * Run: node src/scripts/regenAll.js
 */
async function run() {
  await connectDB();
  const leads = await Lead.find({});
  let n = 0;
  for (const lead of leads) {
    lead.research = generateResearch(lead);
    await lead.save();
    n += 1;
  }
  console.log(`Regenerated research for ${n} leads.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error("regenAll failed:", e.message);
  process.exit(1);
});
