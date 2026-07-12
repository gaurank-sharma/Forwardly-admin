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

const bool = (v) => String(v).toLowerCase() === "true";
const num = (v) => (v === "" || v === undefined ? undefined : Number(v));

function rowToDoc(cols, values) {
  const r = Object.fromEntries(cols.map((c, i) => [c, values[i] ?? ""]));
  let rawProfile = null;
  try {
    rawProfile = r.raw_profile_json ? JSON.parse(r.raw_profile_json) : null;
  } catch {
    rawProfile = null;
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
    websiteUrl: r.website_url,
    contactAvailable: bool(r.contact_available),
    primaryCategory: r.primary_category,
    secondaryCategory: r.secondary_category,
    requiredSpeciality: r.required_speciality,
    companyName: r.company_name,
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
    mspStatus: r.msp_status === "" ? undefined : bool(r.msp_status),
    rawProfile,
  };
}

export async function importBniLeadsFromCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text).filter((r) => r.length > 1 || r[0] !== "");
  if (!rows.length) return { imported: 0, updated: 0, total: 0 };

  const [header, ...dataRows] = rows;
  let imported = 0;
  let updated = 0;

  for (const values of dataRows) {
    if (!values[header.indexOf("user_id")]) continue;
    const doc = rowToDoc(header, values);
    const result = await BniLead.updateOne({ userId: doc.userId }, { $set: doc }, { upsert: true });
    if (result.upsertedCount) imported += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const total = await BniLead.countDocuments();
  return { imported, updated, total };
}
