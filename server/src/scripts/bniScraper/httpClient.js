import axios from "axios";
import { config, canAutoReauth, persistMtoken } from "./config.js";
import { sleep, TokenExpiredError } from "./utils.js";

const UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36";

// POST auth-api/authenticate with client Basic auth + user_id/password —
// this is the same call the site's own login page makes, and its
// access_token is exactly the mtoken used everywhere else (confirmed live:
// same JWT claims shape, ~2h expiry). Lets the scraper self-heal from an
// expired mtoken without a human pasting a fresh curl.
let reauthInFlight = null;
export async function authenticate() {
  if (reauthInFlight) return reauthInFlight;
  reauthInFlight = (async () => {
    const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const res = await axios.post(
      `${config.apiBaseUrl}/auth-api/authenticate`,
      { client_id: config.clientId, user_id: config.username, password: config.password },
      {
        headers: {
          accept: "*/*",
          authorization: `Basic ${basic}`,
          "authorization-version": "V2",
          concept: "CONNECT",
          "content-type": "application/json",
          origin: config.baseUrl,
          "user-agent": UA,
        },
      }
    );
    const token = res.data.content.access_token;
    persistMtoken(token);
    console.log("  ...re-authenticated, minted a fresh mtoken");
    return token;
  })();
  try {
    return await reauthInFlight;
  } finally {
    reauthInFlight = null;
  }
}

async function withRetry(label, fn, { retries = 5, reauthable = false } = {}) {
  let lastErr;
  let reauthed = false;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof TokenExpiredError) throw err;
      const status = err.response?.status;

      if ((status === 401 || status === 403) && reauthable && !reauthed && canAutoReauth()) {
        reauthed = true;
        try {
          await authenticate();
          continue; // retry immediately with the fresh mtoken, doesn't count against backoff retries
        } catch (authErr) {
          throw new TokenExpiredError(
            `${label} got ${status} and re-auth failed: ${authErr.message}`
          );
        }
      }
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
  return withRetry(
    `search("${keyword}", page ${pageNo})`,
    async () => {
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
    },
    { reauthable: true }
  );
}

// Hits networkHome?userId=X and follows the first redirect only, which
// (per observed traffic) points at /web/secure/memberportalredirect?uuId=...
// NOTE: this call is cookie-based (BNI_COOKIE), not Bearer — auto re-auth
// via auth-api/authenticate only mints a fresh mtoken, it does NOT set a
// session cookie (confirmed live: no Set-Cookie in that response), so a
// stale cookie still needs a manual refresh from an active browser session.
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
  return withRetry(
    `fetchProfile(${uuId})`,
    async () => {
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
    },
    { reauthable: true }
  );
}
