import axios from "axios";
import { config } from "../config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Related search terms per industry — widens the net to find more real
   website-less businesses. Generic fallback added for any industry. */
const KEYWORDS = {
  "real estate": ["real estate agents", "property dealers", "real estate consultants", "property brokers"],
  "interior design": ["interior designers", "interior decorators", "home interior", "modular kitchen"],
  restaurant: ["restaurants", "family restaurants", "dhaba", "cafe"],
  gym: ["gyms", "fitness centre", "crossfit", "yoga studio"],
  salon: ["salons", "beauty parlour", "unisex salon", "spa"],
  clinic: ["clinics", "dental clinic", "physiotherapy clinic", "skin clinic"],
  boutique: ["boutiques", "designer boutique", "tailors", "fashion store"],
  cafe: ["cafes", "coffee shop", "bakery"],
};
function keywordVariants(industry, keyword) {
  const key = (industry || "").toLowerCase();
  const base = KEYWORDS[key] || [industry, `${industry} services`, `${industry} shop`, `local ${industry}`];
  return keyword ? [keyword, ...base] : base;
}

/* -------- New Places API (returns website in bulk — efficient) -------- */
async function searchTextNew(textQuery, city) {
  const leads = [];
  let pageToken = null;
  for (let page = 0; page < 3; page++) {
    if (pageToken) await sleep(1600);
    const { data } = await axios.post(
      "https://places.googleapis.com/v1/places:searchText",
      { textQuery, pageSize: 20, regionCode: "IN", ...(pageToken ? { pageToken } : {}) },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.googleKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.googleMapsUri,nextPageToken",
        },
      }
    );
    for (const pl of data.places || []) {
      leads.push({
        placeId: pl.id,
        name: pl.displayName?.text || "Business",
        phone: pl.nationalPhoneNumber || "",
        website: pl.websiteUri || "",
        address: pl.formattedAddress || "",
        city,
        rating: pl.rating || 0,
        reviews: pl.userRatingCount || 0,
        mapsUrl: pl.googleMapsUri || "",
        location: pl.location ? { lat: pl.location.latitude, lng: pl.location.longitude } : undefined,
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return leads;
}

/* -------- Legacy fallback (Text Search + Details for website) -------- */
async function searchTextLegacy(textQuery, city, hardCap = 60) {
  const results = [];
  let pageToken = null;
  for (let page = 0; page < 3; page++) {
    if (pageToken) await sleep(2100);
    const { data } = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      { params: pageToken ? { pagetoken: pageToken, key: config.googleKey } : { query: textQuery, key: config.googleKey } }
    );
    results.push(...(data.results || []));
    pageToken = data.next_page_token;
    if (!pageToken || results.length >= hardCap) break;
  }
  const leads = [];
  for (const r of results.slice(0, hardCap)) {
    let website = "", phone = "", mapsUrl = "";
    try {
      const det = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
        params: { place_id: r.place_id, fields: "website,formatted_phone_number,url", key: config.googleKey },
      });
      website = det.data.result?.website || "";
      phone = det.data.result?.formatted_phone_number || "";
      mapsUrl = det.data.result?.url || "";
    } catch { /* ignore */ }
    leads.push({
      placeId: r.place_id, name: r.name, phone, website,
      address: r.formatted_address || "", city,
      rating: r.rating || 0, reviews: r.user_ratings_total || 0, mapsUrl,
      location: r.geometry?.location ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng } : undefined,
    });
  }
  return leads;
}

let useLegacy = false;
async function searchText(q, city) {
  if (!useLegacy) {
    try {
      return await searchTextNew(q, city);
    } catch (e) {
      console.warn("[google] new Places API failed, using legacy:", e.response?.status || e.message);
      useLegacy = true;
    }
  }
  return await searchTextLegacy(q, city);
}

/**
 * Harvest REAL leads for a config, widening across keyword variants + the whole
 * city until we've collected at least `minHot` website-less (hot) businesses,
 * or run out of queries. Returns { source, leads } (all real candidates).
 */
export async function harvestLeads(cfg, minHot) {
  if (!config.googleKey) return mockLeads(cfg); // offline dev only

  const { industry, city, pincode, keyword } = cfg;
  const area = city || pincode;
  const queries = [
    ...keywordVariants(industry, keyword).map((t) => `${t} in ${area}`),
    `${industry} ${pincode}`,
    `${industry} near ${pincode}`,
  ];

  const collected = new Map();
  let hot = 0;
  for (const q of queries) {
    if (hot >= minHot * 1.6) break; // buffer for DB duplicates on insert
    let batch = [];
    try {
      batch = await searchText(q, city);
    } catch (e) {
      console.warn("[google] query failed:", q, e.message);
      continue;
    }
    for (const l of batch) {
      if (!l.placeId || collected.has(l.placeId)) continue;
      l.industry = industry;
      l.pincode = l.pincode || pincode;
      collected.set(l.placeId, l);
      if (!l.website) hot += 1;
    }
  }
  return { source: useLegacy ? "google-legacy" : "google", leads: [...collected.values()] };
}

/* -------- Deterministic mock (offline dev only) -------- */
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const PREFIX = ["Prime", "Skyline", "Royal", "Elite", "Urban", "Metro", "Star", "Nova", "Apex", "Crown", "Green", "Blue", "Grand", "Shanti", "Krishna", "Om", "Shree", "Capital", "Pioneer", "Signature"];
const SUFFIX = ["Solutions", "Enterprises", "Associates", "Group", "Hub", "Point", "Corner", "World", "Mart", "Care", "Works", "Studio", "Services", "Traders", "House", "Zone", "Bazaar", "Center", "Company", "& Co"];
function mockLeads({ pincode, city, industry }) {
  const rnd = hash(`${pincode}|${industry}`);
  const count = 30 + Math.floor(rnd() * 12);
  const leads = [];
  for (let i = 0; i < count; i++) {
    const p = PREFIX[Math.floor(rnd() * PREFIX.length)];
    const s = SUFFIX[Math.floor(rnd() * SUFFIX.length)];
    const name = `${p} ${industry} ${s}`.replace(/\s+/g, " ").trim();
    const hasWebsite = rnd() > 0.55;
    leads.push({
      placeId: `mock:${pincode}-${industry}-${i}`.toLowerCase().replace(/\s+/g, "-"),
      name, phone: `+91 ${9000000000 + Math.floor(rnd() * 999999999)}`.slice(0, 14),
      website: hasWebsite ? `https://${p}${s}`.toLowerCase().replace(/[^a-z]/g, "") + ".com" : "",
      address: `${Math.floor(rnd() * 200) + 1}, ${city || "Sector"}, ${pincode}`,
      city, pincode, industry, rating: Math.round((3 + rnd() * 2) * 10) / 10,
      reviews: Math.floor(rnd() * 300),
      mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(name + " " + pincode)}`,
      location: { lat: 28.4 + rnd() * 0.3, lng: 76.9 + rnd() * 0.3 },
    });
  }
  return { source: "mock", leads };
}
