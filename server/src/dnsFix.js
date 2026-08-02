import dns from "node:dns";

/**
 * Many ISP/Wi-Fi resolvers (common in India) fail the SRV/TXT DNS lookups that
 * `mongodb+srv://` requires, causing "querySrv ENOTFOUND / ETIMEOUT". Force
 * Node's resolver to use public DNS (Cloudflare + Google) and prefer IPv4.
 * Shared by db.js and bniDb.js — both connect to mongodb+srv:// clusters.
 */
try {
  dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);
  dns.setDefaultResultOrder?.("ipv4first");
} catch {
  /* ignore */
}
