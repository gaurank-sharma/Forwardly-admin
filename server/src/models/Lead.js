import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: String,
    type: String, // call, note, status, reject, recall, assign, attachment
    note: String,
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    name: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    // dedup key — a lead is never ingested/assigned twice
    placeId: { type: String, required: true, unique: true, index: true },

    name: { type: String, required: true },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    hasWebsite: { type: Boolean, default: false },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "", index: true },
    industry: { type: String, default: "", index: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    mapsUrl: { type: String, default: "" },
    location: { lat: Number, lng: Number },

    // hot = no website (assignable) | medium | cold
    classification: {
      type: String,
      enum: ["hot", "medium", "cold"],
      default: "cold",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "new",
        "assigned",
        "contacted",
        "interested",
        "follow_up",
        "won",
        "rejected",
      ],
      default: "new",
      index: true,
    },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedToName: { type: String, default: "" },
    assignedAt: { type: Date, default: null },
    assignedDate: { type: String, default: "", index: true }, // YYYY-MM-DD

    // AI/template research + pitch
    research: {
      summary: { type: String, default: "" },
      pitch: { type: String, default: "" },
      painPoints: { type: [String], default: [] },
      pdfUrl: { type: String, default: "" },
      generatedAt: Date,
    },

    // CRM working fields
    lastReason: { type: String, default: "" },
    lastResponse: { type: String, default: "" },
    needsRecall: { type: Boolean, default: false },
    recallAt: { type: Date, default: null },
    attachments: { type: [attachmentSchema], default: [] },

    // reject: simple (quick no) vs proper (with reason)
    rejected: { type: Boolean, default: false },
    rejectType: { type: String, enum: ["", "simple", "proper"], default: "" },
    rejectReason: { type: String, default: "" },

    activities: { type: [activitySchema], default: [] },

    ingestRunId: { type: mongoose.Schema.Types.ObjectId, ref: "IngestRun" },
    sourceDate: { type: String, default: "" }, // YYYY-MM-DD ingested
    toppedUp: { type: Boolean, default: false }, // true = generated sample (to hit daily hot minimum)
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
