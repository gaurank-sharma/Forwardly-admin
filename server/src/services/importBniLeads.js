import fs from "fs";
import BniLead from "../models/BniLead.js";

// Minimal RFC-4180 CSV parser — handles quoted fields with embedded commas,
// newlines, and doubled-quote escaping, matching the scraper's csvWriter.js.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const bool = (v) => (typeof v === "boolean" ? v : String(v).toLowerCase() === "true");
const num = (v) => (v === "" || v === undefined || v === null ? undefined : Number(v));

// Empty country → unknown, default to Indian since this dataset is
// overwhelmingly India-chapter sourced. Otherwise match "India"/"IN".
function computeIsIndian(country) {
  if (!country) return true;
  const c = String(country).trim().toLowerCase();
  return c === "india" || c === "in";
}

const digitsOnly = (v) => String(v || "").replace(/\D/g, "");

// Anchored ("starts with") prefix matching is what lets phone search use an
// index at scale, but most people search a local number without the
// country code while it's stored WITH one (e.g. "918800907231"). Index
// both the full digits and the last-10 local-only version so a prefix
// search matches whether or not the searcher includes the country code.
function phoneVariants(...numbers) {
  const variants = new Set();
  for (const n of numbers) {
    const d = digitsOnly(n);
    if (!d) continue;
    variants.add(d);
    if (d.length > 10) variants.add(d.slice(-10));
  }
  return [...variants];
}

// Accepts one flat row object keyed by the scraper's CSV_COLUMNS names
// (industry_keyword, user_id, ...) — same shape whether it came from a
// parsed CSV line or a JSON payload posted directly by an external job.
export function mapRowToDoc(r) {
  let rawProfile = r.raw_profile ?? null;
  if (!rawProfile && r.raw_profile_json) {
    try {
      rawProfile = JSON.parse(r.raw_profile_json);
    } catch {
      rawProfile = null;
    }
  }

  return {
    userId: Number(r.user_id),
    uuid: r.uuid,
    industryKeyword: r.industry_keyword,
    searchRank: num(r.search_rank),
    searchScore: num(r.search_score),
    displayName: r.display_name,
    firstName: r.first_name,
    lastName: r.last_name,
    roleInfo: r.role_info,
    phoneNumber: r.phone_number,
    mobileNumber: r.mobile_number,
    emailAddress: r.email_address,
    emailLower: String(r.email_address || "").trim().toLowerCase(),
    websiteUrl: r.website_url,
    contactAvailable: bool(r.contact_available),
    hasEmail: Boolean(r.email_address),
    hasPhone: Boolean(r.phone_number || r.mobile_number),
    hasWebsite: Boolean(r.website_url),
    isIndian: computeIsIndian(r.country),
    // Array so an anchored prefix search matches against either number,
    // with or without the searcher including the country code.
    phoneDigits: phoneVariants(r.phone_number, r.mobile_number),
    primaryCategory: r.primary_category,
    secondaryCategory: r.secondary_category,
    requiredSpeciality: r.required_speciality,
    companyName: r.company_name,
    companyNameLower: String(r.company_name || "").trim().toLowerCase(),
    business: r.business,
    keywords: r.keywords,
    addressLine1: r.address_line1,
    addressLine2: r.address_line2,
    city: r.city,
    state: r.state,
    country: r.country,
    postcode: r.postcode,
    memberChapter: r.member_chapter,
    memberChapterId: num(r.member_chapter_id),
    mspStatus: r.msp_status === "" || r.msp_status === undefined ? undefined : bool(r.msp_status),
    rawProfile,
  };
}

export async function upsertBniLeadRows(rows) {
  let imported = 0;
  let updated = 0;

  for (const r of rows) {
    if (!r.user_id) continue;
    const doc = mapRowToDoc(r);
    const result = await BniLead.updateOne({ userId: doc.userId }, { $set: doc }, { upsert: true });
    if (result.upsertedCount) imported += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const total = await BniLead.countDocuments();
  return { imported, updated, total };
}

export async function importBniLeadsFromCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const parsed = parseCsv(text).filter((r) => r.length > 1 || r[0] !== "");
  if (!parsed.length) return { imported: 0, updated: 0, total: 0 };

  const [header, ...dataRows] = parsed;
  const rows = dataRows.map((values) => Object.fromEntries(header.map((c, i) => [c, values[i] ?? ""])));
  return upsertBniLeadRows(rows);
}
