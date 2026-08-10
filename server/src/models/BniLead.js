import { bniConnection } from "../bniDb.js";
import { buildBniLeadSchema } from "./bniLeadSchema.js";

// "db2" — the dedicated cluster real estate/interior designer/construction
// actively grow on now. See BniLeadOld.js for "db1", the original cluster
// (still holds everything scraped before the switch, no longer written to).
export default bniConnection.model("BniLead", buildBniLeadSchema());
