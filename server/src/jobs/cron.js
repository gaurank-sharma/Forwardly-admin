import cron from "node-cron";
import { config } from "../config.js";
import { runIngest } from "./ingest.js";

/** Schedule the nightly (default 3 AM) ingestion + assignment DAG. */
export function scheduleCron() {
  if (!cron.validate(config.ingestCron)) {
    console.warn("[cron] invalid INGEST_CRON, skipping schedule");
    return;
  }
  cron.schedule(
    config.ingestCron,
    async () => {
      console.log("[cron] nightly ingest starting…");
      try {
        await runIngest({});
      } catch (e) {
        console.error("[cron] ingest error:", e.message);
      }
    },
    { timezone: config.timezone }
  );
  console.log(`[cron] scheduled "${config.ingestCron}" (${config.timezone})`);
}
