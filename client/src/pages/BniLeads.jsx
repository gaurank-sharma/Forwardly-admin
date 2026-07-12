import { useEffect, useState } from "react";
import { Phone, Mail, Globe, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";

const INDUSTRIES = [
  { k: "", label: "All industries" },
  { k: "architects", label: "Architects" },
  { k: "interior designer", label: "Interior designer" },
  { k: "real estate", label: "Real estate" },
  { k: "construction", label: "Construction" },
];

function Stat({ label, value, tone }) {
  const tones = { hot: "text-[#8ab000]", ink: "text-[#0a0a0b]", gray: "text-gray-400" };
  return (
    <div className="card p-4">
      <div className={`text-3xl font-extrabold ${tones[tone] || tones.ink}`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

export default function BniLeads() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [industry, setIndustry] = useState("");
  const [contact, setContact] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const limit = 50;

  const load = async () => {
    const { data } = await api.get("/bni-leads", { params: { industry, contact, q, page, limit } });
    setItems(data.items);
    setTotal(data.total);
  };
  const loadStats = async () => {
    const { data } = await api.get("/bni-leads/stats");
    setStats(data);
  };

  useEffect(() => { load(); }, [industry, contact, page]);
  useEffect(() => { loadStats(); }, []);

  const onSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const runImport = async () => {
    setImporting(true);
    try {
      const { data } = await api.post("/bni-leads/import");
      await Promise.all([load(), loadStats()]);
      alert(`Imported ${data.imported} new, updated ${data.updated}. Total in DB: ${data.total}.`);
    } catch (e) {
      alert(e.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
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
          <button className="btn btn-dark" onClick={runImport} disabled={importing}>
            <RefreshCw size={16} /> {importing ? "Importing…" : "Import from scrape"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total contacts" value={stats.total} tone="ink" />
          <Stat label="With contact info" value={stats.withContact} tone="hot" />
          {INDUSTRIES.filter((i) => i.k).map((i) => (
            <Stat key={i.k} label={i.label} value={stats.byIndustry[i.k] || 0} tone="gray" />
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {INDUSTRIES.map((i) => (
          <button
            key={i.k}
            onClick={() => { setIndustry(i.k); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${industry === i.k ? "bg-[#0a0a0b] text-white" : "bg-white border border-gray-200 text-gray-600"}`}
          >
            {i.label}
          </button>
        ))}
        <select className="input ml-2" style={{ width: 170 }} value={contact} onChange={(e) => { setContact(e.target.value); setPage(1); }}>
          <option value="">Any contact status</option>
          <option value="yes">Has phone/email</option>
          <option value="no">Missing contact info</option>
        </select>
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
                <td className="px-4 py-3 font-medium">{l.displayName}</td>
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
