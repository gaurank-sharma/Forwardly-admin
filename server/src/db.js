import "./dnsFix.js";
import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDB() {
  if (!config.mongoUri) {
    console.error(
      "\n[FATAL] MONGODB_URI is not set. Copy server/.env.example → server/.env and add your MongoDB Atlas URI.\n"
    );
    process.exit(1);
  }
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 20000,
      family: 4, // prefer IPv4 (avoids some Atlas IPv6 stalls)
    });
    console.log("[db] connected to MongoDB Atlas");
  } catch (e) {
    console.error("\n[db] connection failed:", e.message);
    console.error(
      "[db] Checklist: 1) In Atlas → Network Access, allow your IP or 0.0.0.0/0.  " +
        "2) Ensure the DB user/password are correct.  " +
        "3) DNS is already forced to 1.1.1.1/8.8.8.8 in code.\n"
    );
    throw e;
  }
}
