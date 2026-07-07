import mongoose from "mongoose";

/** Log of each nightly (3 AM) ingestion run — powers dashboard stats. */
const ingestRunSchema = new mongoose.Schema(
  {
    date: { type: String, index: true }, // YYYY-MM-DD
    weekday: Number,
    source: { type: String, default: "mock" }, // google | mock
    configs: [{ pincode: String, industry: String, city: String }],
    fetched: { type: Number, default: 0 },
    newLeads: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    hot: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    cold: { type: Number, default: 0 },
    assigned: { type: Number, default: 0 },
    perAgent: { type: Object, default: {} },
    finishedAt: Date,
    ok: { type: Boolean, default: true },
    error: String,
  },
  { timestamps: true }
);

export default mongoose.model("IngestRun", ingestRunSchema);
