import { useEffect, useMemo, useState } from "react";
import { Phone, FileText, Search, ReceiptIndianRupee } from "lucide-react";
import api, { reportUrl, proposalUrl } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import LeadDrawer from "./LeadDrawer.jsx";

const CLS = [
  { k: "", label: "All" },
  { k: "hot", label: "Hot" },
  { k: "medium", label: "Medium" },
  { k: "cold", label: "Cold" },
];
const clsBadge = {
  hot: "bg-[#c2f54b]/25 text-[#5f7a00]",
  medium: "bg-amber-100 text-amber-700",
  cold: "bg-gray-100 text-gray-500",
};

export default function Leads() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [cls, setCls] = useState("");
  const [status, setStatus] = useState("");
  const [assigned, setAssigned] = useState(user.role === "admin" ? "all" : "me");
  const [q, setQ] = useState("");
  const [agents, setAgents] = useState([]);
  const [open, setOpen] = useState(null);

  const load = async () => {
    const { data } = await api.get("/leads", {
      params: { classification: cls, status, assigned, q, limit: 200 },
    });
    setItems(data.items);
    setTotal(data.total);
  };
  useEffect(() => { load(); }, [cls, status, assigned]);
  useEffect(() => {
    if (user.role === "admin") api.get("/agents").then((r) => setAgents(r.data));
  }, []);

  const onSearch = (e) => { e.preventDefault(); load(); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-gray-500">{total} leads · only <b>hot</b> are auto-assigned</p>
        </div>
        <form onSubmit={onSearch} className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input w-full pl-9 sm:w-64" placeholder="Search name / phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CLS.map((c) => (
          <button key={c.k} onClick={() => setCls(c.k)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${cls === c.k ? "bg-[#0a0a0b] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            {c.label}
          </button>
        ))}
        <select className="input ml-2" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {["new", "assigned", "contacted", "interested", "follow_up", "won", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {user.role === "admin" && (
          <select className="input" style={{ width: 180 }} value={assigned} onChange={(e) => setAssigned(e.target.value)}>
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Business</th><th className="px-3 py-3">Type</th><th className="whitespace-nowrap px-3 py-3">Phone</th><th className="px-3 py-3">Status</th><th className="whitespace-nowrap px-3 py-3">Assigned</th><th className="px-3 py-3">Report</th><th className="px-3 py-3">Proposal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l._id} onClick={() => setOpen(l._id)} className="cursor-pointer border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium">
                    {l.name}
                    {(l.toppedUp || l.placeId?.startsWith("topup:")) && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Sample</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{l.industry} · {l.pincode}{l.needsRecall ? " · 🔁 recall" : ""}</div>
                </td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${clsBadge[l.classification]}`}>{l.classification}</span></td>
                <td className="whitespace-nowrap px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-[#6d8b00]"><Phone size={13} /> {l.phone || "—"}</a>
                </td>
                <td className="px-3 py-3 text-gray-600">{l.status}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-500">{l.assignedTo?.name || l.assignedToName || "—"}</td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  {l.classification !== "cold" ? <a href={reportUrl(l._id)} target="_blank" rel="noreferrer" className="text-[#6d8b00]"><FileText size={16} /></a> : "—"}
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <a href={proposalUrl(l._id)} target="_blank" rel="noreferrer" title="Generate pricing proposal" className="text-[#6d8b00]"><ReceiptIndianRupee size={16} /></a>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="py-10 text-center text-gray-400">No leads match.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && <LeadDrawer id={open} agents={agents} onClose={() => setOpen(null)} onChange={load} />}
    </div>
  );
}
