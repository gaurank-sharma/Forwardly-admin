import mongoose from "mongoose";

/**
 * Day-wise pitching config: which pincode + industry to mine on each weekday.
 * weekday: 0=Sun ... 6=Sat. Multiple entries per weekday are allowed.
 */
const dayConfigSchema = new mongoose.Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    city: { type: String, default: "" },
    pincode: { type: String, required: true },
    industry: { type: String, required: true },
    keyword: { type: String, default: "" }, // extra search keyword (optional)
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("DayConfig", dayConfigSchema);
