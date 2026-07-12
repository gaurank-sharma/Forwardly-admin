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
    contactAvailable: { type: Boolean, default: false, index: true },

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

export default mongoose.model("BniLead", bniLeadSchema);
