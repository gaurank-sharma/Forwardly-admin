import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "agent"], default: "agent" },
    // on/off duty. When false, the assignment engine skips this agent.
    active: { type: Boolean, default: true },
    phone: { type: String, default: "" },
  },
  { timestamps: true }
);

userSchema.methods.toSafe = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    active: this.active,
    phone: this.phone,
  };
};

export default mongoose.model("User", userSchema);
