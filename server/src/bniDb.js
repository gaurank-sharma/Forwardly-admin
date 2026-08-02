import "./dnsFix.js";
import mongoose from "mongoose";
import { config } from "./config.js";

// Dedicated connection for BNI data (BniLead + ScrapeProgress) — the
// original cluster (config.mongoUri) filled up under the growth of this
// collection, so it now lives on its own cluster instead of the core CRM's.
// Falls back to the main URI if BNI_MONGODB_URI isn't set, so a missing env
// var degrades gracefully rather than crashing.
//
// Created synchronously (not awaited) — mongoose queues model operations
// until the connection is actually open, so models can be defined against
// this immediately at their own module-load time (see models/BniLead.js).
const uri = config.bniMongoUri || config.mongoUri;
export const bniConnection = mongoose.createConnection(uri, {
  serverSelectionTimeoutMS: 20000,
  family: 4,
});

export async function ensureBniConnected() {
  if (bniConnection.readyState === 1) return; // already connected
  await new Promise((resolve, reject) => {
    bniConnection.once("connected", resolve);
    bniConnection.once("error", reject);
  });
  console.log(
    config.bniMongoUri
      ? "[db] connected to dedicated BNI MongoDB cluster"
      : "[db] BNI_MONGODB_URI not set — BNI data is sharing the main cluster"
  );
}
