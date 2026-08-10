import mongoose from "mongoose";
import crypto from "crypto";

// One question inside a section. `adminPrefill` is set by the admin (from
// the sales conversation) as a sensible default; `clientAnswer` starts
// equal to it and is what the client actually edits/confirms on the public
// onboarding page. Keeping both (not overwriting) lets the admin see what
// changed from their prefill at a glance.
const questionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ["yesno", "yesnomaybe", "text", "number", "upload", "multiupload"],
      default: "yesno",
    },
    helpText: { type: String, default: "" },
    adminPrefill: { type: mongoose.Schema.Types.Mixed, default: null },
    clientAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    // For multiupload: URLs of files the client has attached (replacement
    // images etc.), served from /uploads same as the existing CRM attachments.
    uploads: { type: [String], default: [] },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    // e.g. "This is the Hero section from your demo." — admin-editable
    // context shown to the client above this section's questions.
    description: { type: String, default: "" },
    questions: { type: [questionSchema], default: [] },
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    // Denormalized so the admin list/public page don't need a populate join
    // for the common case, and survive if the Lead is ever archived.
    clientName: { type: String, required: true },

    // Only these two are onboarded through this flow for now — the
    // backend-inclusive tiers (16k/20k) are upsells layered on afterward,
    // not a distinct onboarding path yet.
    plan: { type: String, enum: ["9k", "15k"], required: true },

    token: { type: String, required: true, unique: true, index: true, default: () => crypto.randomBytes(20).toString("hex") },

    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    status: {
      type: String,
      enum: ["draft", "sent", "in_progress", "completed"],
      default: "draft",
      index: true,
    },

    sections: { type: [sectionSchema], default: [] },

    demoUrl: { type: String, default: "" },
    notes: { type: String, default: "" },

    sentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Onboarding", onboardingSchema);
