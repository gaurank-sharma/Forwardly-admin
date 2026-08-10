import mongoose from "mongoose";
import { buildBniLeadSchema } from "./bniLeadSchema.js";

// "db1" — the original cluster (config.mongoUri, the same one Lead/User
// live on). It filled up under this collection's growth, so new leads no
// longer get written here (see BniLead.js for "db2", where writes go now),
// but everything scraped before the switch still lives here and stays
// visible in the dashboard. Bound to the default connection (db.js), with
// an explicit collection name since "BniLeadOld" would otherwise
// auto-pluralize to the wrong collection ("bnileadolds" instead of the
// real "bnileads").
export default mongoose.model("BniLeadOld", buildBniLeadSchema(), "bnileads");
