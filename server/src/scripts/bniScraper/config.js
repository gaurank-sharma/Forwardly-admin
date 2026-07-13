import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFilePath = path.join(__dirname, ".env");
dotenv.config({ path: envFilePath });

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

  // auth-api/authenticate credentials — lets the scraper mint a fresh
  // mtoken itself instead of needing a manually pasted one each time.
  clientId: process.env.BNI_CLIENT_ID || "",
  clientSecret: process.env.BNI_CLIENT_SECRET || "",
  username: process.env.BNI_USERNAME || "",
  password: process.env.BNI_PASSWORD || "",

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

  // Deployed forwardly-leads backend — each scraped lead is also pushed here
  // live via POST /api/bni-leads/ingest, in addition to the local CSV.
  forwardlyApiUrl: (process.env.FORWARDLY_API_URL || "").replace(/\/+$/, ""),
  forwardlyIngestSecret: process.env.FORWARDLY_INGEST_SECRET || "",
};

export function canPushLive() {
  return Boolean(config.forwardlyApiUrl && config.forwardlyIngestSecret);
}

export function canAutoReauth() {
  return Boolean(config.clientId && config.clientSecret && config.username && config.password);
}

export function assertConfig() {
  required("BNI_BASE_URL");
  // A pre-seeded BNI_COOKIE/BNI_MTOKEN is no longer required on its own —
  // if login credentials are set, the scraper bootstraps both from just
  // username+password (see ensureBootstrapAuth in run.js).
  if (!canAutoReauth() && (!config.cookie || !config.mtoken)) {
    throw new Error(
      "Missing BNI_COOKIE/BNI_MTOKEN, and no BNI_USERNAME/BNI_PASSWORD/BNI_CLIENT_ID/BNI_CLIENT_SECRET " +
        "to auto-login with instead (see .env.example)."
    );
  }
}

// Rewrites a var in .env in place so a fresh process start (not just the
// current in-memory run) also picks up the renewed value.
function persistEnvVar(key, value) {
  if (!fs.existsSync(envFilePath)) return;
  const text = fs.readFileSync(envFilePath, "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  const next = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(envFilePath, next);
}

export function persistMtoken(token) {
  config.mtoken = token;
  persistEnvVar("BNI_MTOKEN", token);
}

export function persistCookie(cookieHeader) {
  config.cookie = cookieHeader;
  persistEnvVar("BNI_COOKIE", cookieHeader);
}
