import axios from "axios";
import { config, canPushLive } from "./config.js";

// Best-effort push of one scraped row to the deployed forwardly-leads
// backend's ingest API. Never throws — a live-push failure (Render cold
// start, network blip) should not interrupt the scrape itself; the local
// CSV remains the source of truth and can be imported later regardless.
export async function pushRowLive(row) {
  if (!canPushLive()) return { skipped: true };
  try {
    await axios.post(
      `${config.forwardlyApiUrl}/api/bni-leads/ingest`,
      { rows: [row] },
      {
        params: { key: config.forwardlyIngestSecret },
        headers: { "content-type": "application/json" },
        timeout: 20000,
      }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error || err.message };
  }
}
