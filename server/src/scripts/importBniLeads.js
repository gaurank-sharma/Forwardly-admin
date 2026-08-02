import "dotenv/config";
import { ensureBniConnected, bniConnection } from "../bniDb.js";
import { importBniLeadsFromCsv } from "../services/importBniLeads.js";

const csvPath = process.argv[2];

async function run() {
  if (!csvPath) {
    // The scraper now lives in its own repo (github.com/gaurank-sharma/scrapper)
    // and pushes leads live via POST /api/bni-leads/ingest, so this manual CSV
    // import is just a fallback — point it at that repo's output/bni_leads.csv.
    console.error("Usage: node src/scripts/importBniLeads.js <path-to-bni_leads.csv>");
    process.exit(1);
  }
  await ensureBniConnected();
  const result = await importBniLeadsFromCsv(csvPath);
  console.log(`Imported ${result.imported} new, updated ${result.updated}, total ${result.total} in DB.`);
  await bniConnection.close();
  process.exit(0);
}

run().catch((e) => {
  console.error("importBniLeads failed:", e.message);
  process.exit(1);
});
