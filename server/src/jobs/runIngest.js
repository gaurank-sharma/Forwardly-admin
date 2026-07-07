import { connectDB } from "../db.js";
import { runIngest } from "./ingest.js";

// Manual trigger: `npm run ingest`
await connectDB();
await runIngest({});
process.exit(0);
