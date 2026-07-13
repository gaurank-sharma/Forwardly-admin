import { useEffect, useState } from "react";
import { Phone, Mail, Globe, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";

function Stat({ label, value, tone }) {
  const tones = { hot: "text-[#8ab000]", ink: "text-[#0a0a0b]", gray: "text-gray-400" };
  return (
    <div className="card p-4">
      <div className={`text-3xl font-extrabold ${tones[tone] || tones.ink}`}>{value ?? 0}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

const TRI = [
  { k: "", label: "Any" },
  { k: "yes", label: "Yes" },
  { k: "no", label: "No" },
];

export default function BniLeads() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [industries, setIndustries] = useState([]);

  const [industry, setIndustry] = useState("");
  const [contact, setContact] = useState("");
  const [hasEmail, setHasEmail] = useState("");
  const [hasPhone, setHasPhone] = useState("");
  const [hasWebsite, setHasWebsite] = useState("");
  const [nationality, setNationality] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const limit = 50;

  const load = async () => {
    const { data } = await api.get("/bni-leads", {
      params: { industry, contact, hasEmail, hasPhone, hasWebsite, nationality, q, page, limit },
    });
    setItems(data.items);
    setTotal(data.total);
  };
  const loadStats = async () => {
    const { data } = await api.get("/bni-leads/stats");
    setStats(data);
  };
  const loadIndustries = async () => {
    const { data } = await api.get("/bni-leads/industries");
    setIndustries(data.industries);
  };

  useEffect(() => { load(); }, [industry, contact, hasEmail, hasPhone, hasWebsite, nationality, page]);
  useEffect(() => { loadStats(); loadIndustries(); }, []);

  const onSearch = (e) => { e.preventDefault(); setPage(1); load(); };
  const onFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  // Leads arrive continuously via the scraper's live push (POST /ingest) —
  // this just re-pulls the current DB state into view, no CSV import needed.
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadStats(), loadIndustries()]);
    } finally {
      setRefreshing(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">BNI Data</h1>
          <p className="text-sm text-gray-500">Business-networking contacts scraped from BNI Connect · separate from CRM leads</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={onSearch} className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="input w-56" style={{ paddingLeft: "2.25rem" }} placeholder="Search name / company / email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <button className="btn btn-dark" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={16} /> {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total contacts" value={stats.total} tone="ink" />
          <Stat label="With contact info" value={stats.withContact} tone="hot" />
          <Stat label="Has email" value={stats.hasEmail} tone="gray" />
          <Stat label="Has phone" value={stats.hasPhone} tone="gray" />
          <Stat label="Has website" value={stats.hasWebsite} tone="gray" />
          <Stat label="Foreign (non-India)" value={stats.foreign} tone="gray" />
        </div>
      )}

      {/* filters — a select instead of pills since there are 35+ industries */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input" style={{ width: 220 }} value={industry} onChange={onFilterChange(setIndustry)}>
          <option value="">All industries ({industries.length})</option>
          {industries.map((i) => (
            <option key={i} value={i}>{i}{stats?.byIndustry?.[i] ? ` (${stats.byIndustry[i]})` : ""}</option>
          ))}
        </select>

        <select className="input" style={{ width: 160 }} value={contact} onChange={onFilterChange(setContact)}>
          <option value="">Any contact status</option>
          <option value="yes">Has phone/email</option>
          <option value="no">Missing contact info</option>
        </select>

        <select className="input" style={{ width: 150 }} value={nationality} onChange={onFilterChange(setNationality)}>
          <option value="">Indian + foreign</option>
          <option value="indian">Indian only</option>
          <option value="foreign">Foreign only</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Email
          <select className="input" style={{ width: 80 }} value={hasEmail} onChange={onFilterChange(setHasEmail)}>
            {TRI.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Phone
          <select className="input" style={{ width: 80 }} value={hasPhone} onChange={onFilterChange(setHasPhone)}>
            {TRI.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Website
          <select className="input" style={{ width: 80 }} value={hasWebsite} onChange={onFilterChange(setHasWebsite)}>
            {TRI.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Industry</th>
              <th className="px-3 py-3">Chapter</th>
              <th className="px-3 py-3">City</th>
              <th className="whitespace-nowrap px-3 py-3">Phone</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Website</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {l.displayName}
                  {l.isIndian === false && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">Foreign</span>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-600">{l.companyName || "—"}</td>
                <td className="px-3 py-3 text-gray-500">{l.industryKeyword}</td>
                <td className="px-3 py-3 text-gray-500">{l.memberChapter || "—"}</td>
                <td className="px-3 py-3 text-gray-500">{l.city || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {l.phoneNumber ? <a href={`tel:${l.phoneNumber}`} className="inline-flex items-center gap-1 text-[#6d8b00]"><Phone size={13} /> {l.phoneNumber}</a> : "—"}
                </td>
                <td className="px-3 py-3">
                  {l.emailAddress ? <a href={`mailto:${l.emailAddress}`} className="inline-flex items-center gap-1 text-[#6d8b00]"><Mail size={13} /> {l.emailAddress}</a> : "—"}
                </td>
                <td className="px-3 py-3">
                  {l.websiteUrl ? <a href={l.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#6d8b00]"><Globe size={13} /> Site</a> : "—"}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No contacts match.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div>{total} total · page {page}/{pages}</div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16} /> Prev</button>
          <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
