import { useEffect, useRef, useState } from "react";
import { X, Phone, Globe, MapPin, Star, FileText, RefreshCw, Paperclip, PhoneCall, Ban, RotateCcw, ReceiptIndianRupee } from "lucide-react";
import api, { reportUrl, proposalUrl } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";

const STATUSES = ["new", "assigned", "contacted", "interested", "follow_up", "won", "rejected"];

export default function LeadDrawer({ id, agents = [], onClose, onChange }) {
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pitchLang, setPitchLang] = useState("en");
  const fileRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/leads/${id}`);
    setLead(data);
  };
  useEffect(() => { load(); }, [id]);

  const refresh = async () => { await load(); onChange?.(); };
  const set = (patch) => setLead((l) => ({ ...l, ...patch }));

  const saveCrm = async () => {
    setSaving(true);
    try {
      await api.patch(`/leads/${id}`, {
        status: lead.status,
        lastReason: lead.lastReason,
        lastResponse: lead.lastResponse,
        needsRecall: lead.needsRecall,
        recallAt: lead.recallAt,
      });
      await refresh();
    } finally { setSaving(false); }
  };

  const logCall = async () => {
    const outcome = prompt("Call outcome (e.g. no answer / interested / not interested):", "answered");
    if (outcome === null) return;
    await api.post(`/leads/${id}/call`, { outcome });
    await refresh();
  };
  const reject = async (type) => {
    let reason = "";
    if (type === "proper") { reason = prompt("Reject reason:") || ""; if (!reason) return; }
    await api.post(`/leads/${id}/reject`, { type, reason });
    await refresh();
  };
  const reopen = async () => { await api.post(`/leads/${id}/reopen`); await refresh(); };
  const regen = async () => { await api.post(`/leads/${id}/research`); await refresh(); };
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/leads/${id}/attachment`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    await refresh();
  };
  const assign = async (agentId) => { await api.post(`/leads/${id}/assign`, { agentId }); await refresh(); };

  if (!lead) return null;
  const badge = { hot: "bg-[#c2f54b] text-[#0a0a0b]", medium: "bg-amber-400 text-white", cold: "bg-gray-300 text-gray-700" }[lead.classification];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 no-scrollbar" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${badge}`}>{lead.classification}</span>
              {lead.needsRecall && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">Recall</span>}
              {lead.rejected && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">Rejected · {lead.rejectType}</span>}
              {(lead.toppedUp || lead.placeId?.startsWith("topup:")) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Sample lead</span>}
            </div>
            <h2 className="mt-2 text-xl font-bold">{lead.name}</h2>
            <div className="text-sm text-gray-500">{lead.industry} · {lead.city} {lead.pincode}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        </div>

        {/* quick facts + call */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 rounded-lg bg-[#c2f54b] px-3 py-2 font-semibold text-[#0a0a0b]"><PhoneCall size={16} /> Call {lead.phone}</a>
          <button onClick={logCall} className="btn btn-ghost justify-center"><Phone size={15} /> Log call</button>
        </div>
        <div className="mt-3 space-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Globe size={14} /> {lead.website ? <a className="text-[#6d8b00]" href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a> : <span className="text-red-500">No website (opportunity)</span>}</div>
          <div className="flex items-center gap-2"><MapPin size={14} /> {lead.address || "—"}</div>
          <div className="flex items-center gap-2"><Star size={14} /> {lead.rating || "—"}★ · {lead.reviews} reviews · <a className="text-[#6d8b00]" href={lead.mapsUrl} target="_blank" rel="noreferrer">Maps</a></div>
        </div>

        {/* research / pitch */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Research & pitch</h3>
            <div className="flex gap-2">
              <a href={reportUrl(lead._id)} target="_blank" rel="noreferrer" className="btn btn-dark px-3 py-1.5 text-xs"><FileText size={13} /> PDF</a>
              <button onClick={regen} className="btn btn-ghost px-3 py-1.5 text-xs"><RefreshCw size={13} /> Regenerate</button>
            </div>
          </div>
          <div className="mt-3">
            <a href={proposalUrl(lead._id)} target="_blank" rel="noreferrer" className="btn btn-primary px-3 py-1.5 text-xs">
              <ReceiptIndianRupee size={13} /> Generate proposal / pricing doc
            </a>
          </div>
          <p className="text-sm text-gray-700">{lead.research?.summary || "—"}</p>
          {lead.research?.painPoints?.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
              {lead.research.painPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {(lead.research?.pitch || lead.research?.pitchHi) && (
            <div className="mt-3">
              <div className="mb-2 flex gap-1.5">
                <button
                  onClick={() => setPitchLang("en")}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${pitchLang === "en" ? "bg-[#0a0a0b] text-white" : "border border-gray-200 bg-white text-gray-500"}`}
                >
                  English
                </button>
                <button
                  onClick={() => setPitchLang("hi")}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${pitchLang === "hi" ? "bg-[#0a0a0b] text-white" : "border border-gray-200 bg-white text-gray-500"}`}
                >
                  Hinglish
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-gray-700">
                {pitchLang === "en"
                  ? lead.research?.pitch || "—"
                  : lead.research?.pitchHi || "Hinglish script not generated yet — click Regenerate."}
              </pre>
            </div>
          )}
        </div>

        {/* CRM form */}
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Status</label>
              <select className="input" value={lead.status} onChange={(e) => set({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Recall on</label>
              <input type="datetime-local" className="input" value={lead.recallAt ? lead.recallAt.slice(0, 16) : ""} onChange={(e) => set({ recallAt: e.target.value, needsRecall: !!e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Their response</label>
            <input className="input" value={lead.lastResponse || ""} onChange={(e) => set({ lastResponse: e.target.value })} placeholder="What did they say?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Reason / notes</label>
            <textarea className="input" rows={2} value={lead.lastReason || ""} onChange={(e) => set({ lastReason: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!lead.needsRecall} onChange={(e) => set({ needsRecall: e.target.checked })} /> Needs recall
          </label>

          <div className="flex flex-wrap gap-2">
            <button onClick={saveCrm} disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => fileRef.current.click()} className="btn btn-ghost"><Paperclip size={15} /> Attach proof</button>
            <input ref={fileRef} type="file" hidden onChange={upload} />
            {lead.rejected ? (
              <button onClick={reopen} className="btn btn-ghost"><RotateCcw size={15} /> Reopen</button>
            ) : (
              <>
                <button onClick={() => reject("simple")} className="btn btn-ghost text-red-600"><Ban size={15} /> Reject</button>
                <button onClick={() => reject("proper")} className="btn btn-ghost text-red-600"><Ban size={15} /> Reject + reason</button>
              </>
            )}
          </div>

          {/* attachments */}
          {lead.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lead.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600"><Paperclip size={12} /> {a.name}</a>
              ))}
            </div>
          )}

          {/* admin assign */}
          {user.role === "admin" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Reassign (admin)</label>
              <select className="input" value="" onChange={(e) => e.target.value && assign(e.target.value)}>
                <option value="">Assign to…</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.active ? "" : " (off)"}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* activity */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold">Activity</h3>
          <div className="space-y-2">
            {[...(lead.activities || [])].reverse().map((a, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c2f54b]" />
                <div>
                  <span className="text-gray-700">{a.note || a.type}</span>
                  <span className="ml-2 text-xs text-gray-400">{new Date(a.at).toLocaleString()} {a.byName ? "· " + a.byName : ""}</span>
                </div>
              </div>
            ))}
            {!lead.activities?.length && <div className="text-sm text-gray-400">No activity yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
