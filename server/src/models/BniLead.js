import mongoose from "mongoose";

// Scraped from BNI Connect (separate source/purpose from the Google-Places
// Lead model — these are business-networking contacts, not client leads).
const bniLeadSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true, index: true },
    uuid: { type: String, default: "" },

    industryKeyword: { type: String, default: "", index: true },
    searchRank: Number,
    searchScore: Number,

    displayName: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    roleInfo: { type: String, default: "" },

    phoneNumber: { type: String, default: "" },
    mobileNumber: { type: String, default: "" },
    emailAddress: { type: String, default: "", index: true },
    websiteUrl: { type: String, default: "" },
    // Normalized copies for fast indexed search — digits-only phone and
    // lowercased email/company let search use an anchored (prefix) regex,
    // which unlike an unanchored substring regex CAN use a B-tree index.
    // Unanchored "contains anywhere" search across 4 text columns is a
    // full collection scan once this crosses tens of thousands of rows.
    // phoneDigits is an array (phone + mobile, whichever are present) —
    // MongoDB indexes each element separately (multikey index), so an
    // anchored prefix search still uses the index against either number.
    phoneDigits: { type: [String], default: [], index: true },
    emailLower: { type: String, default: "", index: true },
    companyNameLower: { type: String, default: "", index: true },
    contactAvailable: { type: Boolean, default: false, index: true },
    // Computed booleans, precomputed at write time so filtering at 30-40k+
    // scale is a fast indexed lookup instead of a regex/existence scan.
    hasEmail: { type: Boolean, default: false, index: true },
    hasPhone: { type: Boolean, default: false, index: true },
    hasWebsite: { type: Boolean, default: false, index: true },
    isIndian: { type: Boolean, default: true, index: true },

    primaryCategory: { type: String, default: "" },
    secondaryCategory: { type: String, default: "" },
    requiredSpeciality: { type: String, default: "" },
    companyName: { type: String, default: "" },
    business: { type: String, default: "" },
    keywords: { type: String, default: "" },

    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    city: { type: String, default: "", index: true },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    postcode: { type: String, default: "" },

    memberChapter: { type: String, default: "", index: true },
    memberChapterId: Number,
    mspStatus: Boolean,

    rawProfile: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

bniLeadSchema.index({ companyName: "text", displayName: "text", business: "text" });
// Common combined filters (industry + contact-info toggles) at list-page scale.
bniLeadSchema.index({ industryKeyword: 1, hasEmail: 1, hasPhone: 1 });
bniLeadSchema.index({ isIndian: 1, industryKeyword: 1 });

export default mongoose.model("BniLead", bniLeadSchema);
