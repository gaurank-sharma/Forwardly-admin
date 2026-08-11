import mongoose from "mongoose";
import crypto from "crypto";

// Admin sets `adminPrefill` from the sales conversation; `clientAnswer`
// starts null and is what the client actually fills in on the public page.
// Keeping both (not overwriting) lets the admin see what changed from
// their prefill at a glance.
const answerFields = {
  adminPrefill: { type: mongoose.Schema.Types.Mixed, default: null },
  clientAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
};

// Step 1: personal & professional details. Admin pre-fills from the Lead
// record when the onboarding is created; client can correct anything.
const profileFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["text", "tel", "email", "textarea"], default: "text" },
    required: { type: Boolean, default: true },
    ...answerFields,
  },
  { _id: false }
);

// A single yes/no(/maybe) gate question — "keep as is?", "change images?",
// "do you like the demo?" all use this shape.
const gateSchema = new mongoose.Schema(answerFields, { _id: false });

// A single free-text answer — "any wording changes?", "what don't you
// like about the demo?".
const textAnswerSchema = new mongoose.Schema(answerFields, { _id: false });

// One conditional per-section block:
//   keepAsIs = "yes"  -> nothing else asked, section done
//   keepAsIs != "yes" -> ask changeImages (only if imageCount > 0)
//     changeImages = "yes" -> client picks which of 1..imageCount to
//                             replace (imagesToChange) and uploads each
//   contentChanges is always offered once keepAsIs != "yes"
const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    // e.g. "This is the Hero section from your demo." — shown to the client.
    description: { type: String, default: "" },
    // Admin-configurable — how many images this section actually has in the
    // demo. 0 means the section has no swappable images (e.g. Services).
    imageCount: { type: Number, default: 0, min: 0 },

    keepAsIs: { type: gateSchema, default: () => ({}) },
    changeImages: { type: gateSchema, default: () => ({}) },
    // 1-based indices into the section's imageCount the client wants replaced.
    imagesToChange: { type: [Number], default: [] },
    imageUploads: {
      type: [
        {
          index: { type: Number, required: true },
          url: { type: String, required: true },
          // What this specific replacement image is / where it goes —
          // e.g. "our new modular kitchen shot, use for panel 3". Separate
          // from the section-wide contentChanges text below.
          caption: { type: String, default: "" },
        },
      ],
      default: [],
      _id: false,
    },
    contentChanges: { type: textAnswerSchema, default: () => ({}) },
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

    // Wizard step 1.
    profileFields: { type: [profileFieldSchema], default: [] },
    // Wizard step 2: "do you like our demo?" gate, plus optional feedback
    // text shown when the answer isn't a plain yes.
    likesDemo: { type: gateSchema, default: () => ({}) },
    demoFeedback: { type: textAnswerSchema, default: () => ({}) },

    // Wizard steps 3..N, one per demo section.
    sections: { type: [sectionSchema], default: [] },

    demoUrl: { type: String, default: "" },
    notes: { type: String, default: "" },

    sentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Onboarding", onboardingSchema);
