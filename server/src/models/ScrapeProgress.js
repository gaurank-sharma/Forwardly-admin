import mongoose from "mongoose";

// Singleton doc holding the BNI scraper's per-industry page progress.
// Exists so progress survives redeploys of the scraper's own (ephemeral)
// hosting — Render's free Web Service disk is not guaranteed to persist
// across deploys, but this database always does.
const scrapeProgressSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "bni-scraper" },
    industries: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("ScrapeProgress", scrapeProgressSchema);
