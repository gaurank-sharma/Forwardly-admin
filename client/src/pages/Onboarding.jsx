import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Copy, Trash2, ExternalLink } from "lucide-react";
import api from "../lib/api";

const STATUS_TONE = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-[#c2f54b]/25 text-[#5f7a00]",
};

const PUBLIC_ORIGIN = import.meta.env.VITE_FORWARDLY_SITE_ORIGIN || "https://forwardly.in";

function NewOnboardingModal({ onClose, onCreated }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [lead, setLead] = useState(null);
  const [plan, setPlan] = useState("9k");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(async () => {
      const { data } = await api.get("/leads", { params: { q, limit: 8 } });
      setResults(data.items);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const create = async () => {
    if (!lead) return;
    setBusy(true);
    try {
      const { data } = await api.post("/onboarding", { leadId: lead._id, plan });
      onCreated(data);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        <h3 className="mb-4 text-lg font-bold">New onboarding</h3>

        {!lead ? (
          <>
            <input
              autoFocus
              className="input mb-2"
              placeholder="Search leads by name/phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
              {results.map((l) => (
                <button
                  key={l._id}
                  onClick={() => setLead(l)}
                  className="flex w-full flex-col items-start border-b border-gray-50 px-3 py-2 text-left last:border-0 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium">{l.name}</span>
                  <span className="text-xs text-gray-400">{l.phone} · {l.city}</span>
                </button>
              ))}
              {q.trim() && !results.length && (
                <div className="px-3 py-4 text-center text-sm text-gray-400">No leads match.</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-sm font-semibold">{lead.name}</div>
              <div className="text-xs text-gray-400">{lead.phone} · {lead.city}</div>
              <button className="mt-1 text-xs text-[#6d8b00]" onClick={() => setLead(null)}>Change lead</button>
            </div>
            <div className="mb-4 flex gap-2">
              {["9k", "15k"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${plan === p ? "border-[#0a0a0b] bg-[#0a0a0b] text-white" : "border-gray-200 text-gray-600"}`}
                >
                  ₹{p === "9k" ? "9,000" : "15,000"} plan
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" disabled={!lead || busy} onClick={create}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [items, setItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showNew, setShowNew] = useState(false);

  const load = async () => setItems((await api.get("/onboarding")).data);
  useEffect(() => {
    load();
    api.get("/agents").then((r) => setAgents(r.data));
  }, []);

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${PUBLIC_ORIGIN}/onboarding/${token}`);
    alert("Link copied");
  };

  const remove = async (id) => {
    if (!confirm("Delete this onboarding?")) return;
    await api.delete(`/onboarding/${id}`);
    load();
  };

  const assignPm = async (id, agentId) => {
    const { data } = await api.patch(`/onboarding/${id}`, { projectManager: agentId || null });
    setItems((prev) => prev.map((o) => (o._id === id ? { ...o, projectManager: data.projectManager } : o)));
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Onboarding</h1>
          <p className="text-sm text-gray-500">Post-demo section-by-section handoff — 9k &amp; 15k plans</p>
        </div>
        <button className="btn btn-dark" onClick={() => setShowNew(true)}><Plus size={16} /> New onboarding</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-3 py-3">Plan</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">PM</th>
              <th className="px-3 py-3">Link</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/onboarding/${o._id}`} className="font-medium hover:text-[#6d8b00]">{o.clientName}</Link>
                  <div className="text-xs text-gray-400">{o.lead?.phone}</div>
                </td>
                <td className="px-3 py-3 text-gray-600">₹{o.plan === "9k" ? "9,000" : "15,000"}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[o.status]}`}>{o.status.replace("_", " ")}</span>
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    className="input py-1.5 text-sm"
                    style={{ width: 190 }}
                    value={o.projectManager?._id || o.projectManager || ""}
                    onChange={(e) => assignPm(o._id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.phone ? ` · ${a.phone}` : ""}</option>)}
                  </select>
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <button className="inline-flex items-center gap-1 text-[#6d8b00]" onClick={() => copyLink(o.token)}>
                    <Copy size={13} /> Copy
                  </button>
                  <a
                    href={`${PUBLIC_ORIGIN}/onboarding/${o.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 inline-flex items-center gap-1 text-gray-400 hover:text-[#6d8b00]"
                  >
                    <ExternalLink size={13} />
                  </a>
                </td>
                <td className="px-3 py-3 text-right">
                  <button className="text-gray-300 hover:text-red-500" onClick={() => remove(o._id)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400">No onboardings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewOnboardingModal
          onClose={() => setShowNew(false)}
          onCreated={(doc) => { setShowNew(false); load(); window.location.href = `/onboarding/${doc._id}`; }}
        />
      )}
    </div>
  );
}
