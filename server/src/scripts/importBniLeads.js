import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { importBniLeadsFromCsv } from "../services/importBniLeads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = process.argv[2] || path.join(__dirname, "bniScraper/output/bni_leads.csv");

async function run() {
  await connectDB();
  const result = await importBniLeadsFromCsv(csvPath);
  console.log(`Imported ${result.imported} new, updated ${result.updated}, total ${result.total} in DB.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error("importBniLeads failed:", e.message);
  process.exit(1);
});
