import axios from "axios";
import { config, canAutoReauth, persistMtoken, persistCookie } from "./config.js";
import { sleep, TokenExpiredError } from "./utils.js";

const UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36";

// POST auth-api/authenticate with client Basic auth + user_id/password —
// this is the same call the site's own login page makes. Returns the full
// token set (access/refresh/expires_in); access_token doubles as the
// mtoken used everywhere else (confirmed live: same JWT claims shape).
async function getFreshTokens() {
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
  return res.data.content; // { access_token, refresh_token, expires_in }
}

// Mints a fresh mtoken and persists it. Lets the scraper self-heal from an
// expired mtoken without a human pasting a fresh curl.
let reauthInFlight = null;
export async function authenticate() {
  if (reauthInFlight) return reauthInFlight;
  reauthInFlight = (async () => {
    const { access_token } = await getFreshTokens();
    persistMtoken(access_token);
    console.log("  ...re-authenticated, minted a fresh mtoken");
    return access_token;
  })();
  try {
    return await reauthInFlight;
  } finally {
    reauthInFlight = null;
  }
}

function extractCookieValue(setCookieHeaders, name) {
  for (const h of setCookieHeaders || []) {
    const m = h.match(new RegExp(`${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
}

// Full browser-free login, reverse-engineered from the site's own legacy
// login page (a classic Spring Security form at /web/open/login):
//   1. GET /web/secure/home with no cookie -> Set-Cookie gives an
//      anonymous JSESSIONID (confirmed live).
//   2. getFreshTokens() -> access_token/refresh_token/expires_in.
//   3. POST /web/j_spring_security_jwt_check (form-encoded) with
//      j_username/j_access/j_refresh/j_expiry against that JSESSIONID —
//      this is the exact bridge the login page's second form
//      ("loginbox2") uses to upgrade an anonymous session to an
//      authenticated one from a JWT, instead of a password form post.
//   4. One warm-up GET of /web/secure/home — the very first authenticated
//      request sometimes lands on a one-time "insecure password" nag
//      redirect chain instead of real content; a second request goes
//      straight through (confirmed live).
let cookieLoginInFlight = null;
export async function loginFresh() {
  if (cookieLoginInFlight) return cookieLoginInFlight;
  cookieLoginInFlight = (async () => {
    const homeRes = await axios.get(`${config.baseUrl}/web/secure/home`, {
      headers: { "user-agent": UA },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const jsessionId = extractCookieValue(homeRes.headers["set-cookie"], "JSESSIONID");
    if (!jsessionId) throw new Error("Could not obtain an anonymous JSESSIONID from /web/secure/home");

    const { access_token, refresh_token, expires_in } = await getFreshTokens();
    persistMtoken(access_token);

    const checkRes = await axios.post(
      `${config.baseUrl}/web/j_spring_security_jwt_check`,
      new URLSearchParams({
        j_username: config.username,
        j_access: access_token,
        j_refresh: refresh_token,
        j_expiry: String(expires_in),
        j_login_page: "",
        j_password: "",
      }).toString(),
      {
        headers: {
          cookie: `JSESSIONID=${jsessionId}`,
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": UA,
        },
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400,
      }
    );
    const upgradedJsessionId = extractCookieValue(checkRes.headers["set-cookie"], "JSESSIONID") || jsessionId;
    const cookieHeader = `JSESSIONID=${upgradedJsessionId}`;

    // Flush the one-time post-login nag chain (insecurePasswordWarningRedirect
    // -> operationsRegionEditMembership -> ...), which only triggers on the
    // FIRST networkHome hit of a freshly-authenticated session, not on
    // /web/secure/home. Follow it all the way through (fully, not just one
    // hop) so the real resolveUuid call right after this doesn't hit it.
    await axios
      .get(`${config.baseUrl}/web/secure/networkHome`, {
        params: { userId: 1500160 }, // any valid userId — the nag is session-level, not target-specific
        headers: { cookie: cookieHeader, "user-agent": UA },
        maxRedirects: 10,
        validateStatus: () => true,
      })
      .catch(() => {});

    persistCookie(cookieHeader);
    console.log("  ...logged in fresh, minted a new session cookie");
    return cookieHeader;
  })();
  try {
    return await cookieLoginInFlight;
  } finally {
    cookieLoginInFlight = null;
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
// NOTE: this call is cookie-based (BNI_COOKIE), not Bearer. On a stale
// cookie (redirected to login), calls loginFresh() to mint a brand new
// session from just username+password, then retries once.
export async function resolveUuid(userId) {
  let cookieReauthed = false;
  for (;;) {
    try {
      return await withRetry(`resolveUuid(${userId})`, async () => {
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
    } catch (err) {
      if (err instanceof TokenExpiredError && !cookieReauthed && canAutoReauth()) {
        cookieReauthed = true;
        console.log("  ...BNI_COOKIE stale, logging in fresh...");
        await loginFresh();
        continue;
      }
      throw err;
    }
  }
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
