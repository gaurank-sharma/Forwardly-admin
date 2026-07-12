import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name} (see .env.example in this folder)`);
  return v;
}

function list(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = {
  // www.bniconnectglobal.com — serves search, networkHome, memberportalredirect
  baseUrl: (process.env.BNI_BASE_URL || "https://www.bniconnectglobal.com").replace(/\/+$/, ""),
  // api.bniconnectglobal.com — serves member-api/v2/home (confirmed working)
  apiBaseUrl: (process.env.BNI_API_BASE_URL || "https://api.bniconnectglobal.com").replace(/\/+$/, ""),
  searchToken: process.env.BNI_SEARCH_TOKEN || "",
  cookie: process.env.BNI_COOKIE || "",
  mtoken: process.env.BNI_MTOKEN || "",
  profileUrlTemplate: process.env.BNI_PROFILE_URL_TEMPLATE || "",

  industries: list("BNI_INDUSTRIES", [
    "architects",
    "interior designer",
    "real estate",
    "construction",
  ]),
  conceptId: Number(process.env.BNI_CONCEPT_ID || 1),
  localeCode: process.env.BNI_LOCALE || "en_IN",
  perPage: Number(process.env.BNI_PER_PAGE || 20),
  maxPagesPerIndustry: process.env.BNI_MAX_PAGES_PER_INDUSTRY
    ? Number(process.env.BNI_MAX_PAGES_PER_INDUSTRY)
    : null,

  delayMinMs: Number(process.env.BNI_DELAY_MIN_MS || 300),
  delayMaxMs: Number(process.env.BNI_DELAY_MAX_MS || 800),

  outputFile: path.resolve(__dirname, process.env.BNI_OUTPUT_FILE || "output/bni_leads.csv"),
  stateFile: path.resolve(__dirname, process.env.BNI_STATE_FILE || "output/state.json"),
  errorLogFile: path.resolve(__dirname, process.env.BNI_ERROR_LOG_FILE || "output/errors.log"),
};

export function assertConfig() {
  required("BNI_BASE_URL");
  required("BNI_COOKIE");
  required("BNI_MTOKEN");
  // BNI_SEARCH_TOKEN is optional — confirmed live that BNI_MTOKEN works for
  // both search and profile calls, so it's only needed if that ever changes.
}
