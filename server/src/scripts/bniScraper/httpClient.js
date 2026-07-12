import axios from "axios";
import { config } from "./config.js";
import { sleep, TokenExpiredError } from "./utils.js";

const UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36";

async function withRetry(label, fn, retries = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof TokenExpiredError) throw err;
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        throw new TokenExpiredError(`${label} got ${status} — token/cookie likely expired`);
      }
      lastErr = err;
      if (status === 429 || (status >= 500 && status < 600) || !status) {
        const retryAfterSec = Number(err.response?.headers?.["retry-after"]);
        const backoffMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec * 1000
          : 4000 * attempt;
        console.log(`  ...${label} got ${status || "network error"}, backing off ${Math.round(backoffMs / 1000)}s (attempt ${attempt}/${retries})`);
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Confirmed live: same bearer token as fetchProfile (BNI_MTOKEN) works here
// too — this is not a separate credential despite living under a different
// path/host prefix (connect-search-api vs member-api).
export async function searchMembers(keyword, pageNo) {
  return withRetry(`search("${keyword}", page ${pageNo})`, async () => {
    const res = await axios.post(
      `${config.apiBaseUrl}/connect-search-api/search/member/advanced`,
      {
        search_keywords: keyword,
        concept_id: config.conceptId,
        locale_code: config.localeCode,
        page_no: pageNo,
        per_page: config.perPage,
      },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          authorization: `Bearer ${config.searchToken || config.mtoken}`,
          "content-type": "application/json",
          origin: config.baseUrl,
          "user-agent": UA,
        },
      }
    );
    return res.data.content;
  });
}

// Hits networkHome?userId=X and follows the first redirect only, which
// (per observed traffic) points at /web/secure/memberportalredirect?uuId=...
export async function resolveUuid(userId) {
  return withRetry(`resolveUuid(${userId})`, async () => {
    const res = await axios.get(`${config.baseUrl}/web/secure/networkHome`, {
      params: { userId },
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        cookie: config.cookie,
        "user-agent": UA,
      },
      maxRedirects: 0,
      validateStatus: (s) => (s >= 200 && s < 300) || (s >= 300 && s < 400),
    });

    const location = res.headers?.location;
    if (location && /\/web\/open\/login/.test(location)) {
      throw new TokenExpiredError(`networkHome for userId=${userId} redirected to login — BNI_COOKIE is stale`);
    }
    if (!location) {
      throw new Error(`networkHome for userId=${userId} did not return a redirect Location header`);
    }
    const match = location.match(/uuId=([0-9a-fA-F-]+)/);
    if (!match) {
      throw new Error(`Could not find uuId in redirect Location: ${location}`);
    }
    return match[1];
  });
}

// Confirmed by live probe against the real API: /core-api/profile (no v2
// prefix) is a "whoami" endpoint that ignores uuId entirely and always
// returns the token owner's own profile — it is NOT usable for leads.
// The actual per-member endpoint, extracted from the SPA bundle's `ec()`
// query-string helper (which auto-appends ?uuId=...&memberId=... from the
// current page URL) and verified against a real lead, is:
//   GET https://api.bniconnectglobal.com/member-api/v2/home?uuId={uuId}
// NOTE: this endpoint returns company/category/chapter/name reliably, but
// phoneNumber/emailAddress often come back null — BNI appears to gate full
// contact details behind an actual connection, not just search visibility.
// Treat contact_available in the output as "got lucky", not guaranteed.
export async function fetchProfile(uuId) {
  return withRetry(`fetchProfile(${uuId})`, async () => {
    const url = config.profileUrlTemplate
      ? config.profileUrlTemplate.replace("{uuId}", encodeURIComponent(uuId))
      : `${config.apiBaseUrl}/member-api/v2/home?uuId=${encodeURIComponent(uuId)}`;

    const res = await axios.get(url, {
      headers: {
        accept: "*/*",
        authorization: `Bearer ${config.mtoken}`,
        "user-agent": UA,
      },
    });
    return res.data.content;
  });
}
