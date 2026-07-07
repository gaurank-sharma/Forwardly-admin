import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, FileText, Play, RefreshCw, Phone } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../lib/auth.jsx";

function Stat({ label, value, tone }) {
  const tones = { hot: "text-[#8ab000]", ink: "text-[#0a0a0b]", gray: "text-gray-400" };
  return (
    <div className="card p-4">
      <div className={`text-3xl font-extrabold ${tones[tone] || tones.ink}`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [ov, setOv] = useState(null);
  const [hot, setHot] = useState([]);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const [o, h] = await Promise.all([
      api.get("/stats/overview"),
      api.get("/leads", { params: { classification: "hot", limit: 100 } }),
    ]);
    setOv(o.data);
    setHot(h.data.items);
  };
  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      await api.post("/stats/ingest");
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Ingest failed");
    } finally {
      setRunning(false);
    }
  };

  if (!ov) return <div className="text-sm text-gray-500">Loading…</div>;
  const c = ov.counts;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">{ov.weekday} · {ov.today} · {ov.workingDaysThisMonth} working days · {ov.activeDays} active days</p>
        </div>
        {user.role === "admin" && (
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={load}><RefreshCw size={16} /> Refresh</button>
            <button className="btn btn-dark" onClick={runNow} disabled={running}>
              <Play size={16} /> {running ? "Running…" : "Run ingest now"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Hot leads" value={c.hot} tone="hot" />
        <Stat label="Medium" value={c.medium} tone="gray" />
        <Stat label="Cold" value={c.cold} tone="gray" />
        <Stat label="Assigned today" value={c.assignedToday} tone="ink" />
        <Stat label="Need recall" value={c.pendingRecall} tone="ink" />
        <Stat label="Won" value={c.won} tone="hot" />
      </div>

      {/* agents */}
      <div className="mt-6 card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Agents</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {ov.agents.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-gray-500">{a.today}/50 today · {a.total} total</div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${a.active ? "bg-[#c2f54b]/20 text-[#6d8b00]" : "bg-gray-200 text-gray-500"}`}>
                <span className={`h-2 w-2 rounded-full ${a.active ? "bg-[#8ab000]" : "bg-gray-400"}`} /> {a.active ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* hot leads with pitch reports */}
      <div className="mt-6 card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
            <Flame size={16} className="text-[#8ab000]" /> Hot leads & pitch reports ({hot.length})
          </h2>
          <Link to="/leads" className="text-sm font-semibold text-[#6d8b00]">Open CRM →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-400">
                <th className="py-2">Business</th><th>Industry</th><th>Phone</th><th>Assigned</th><th>Pitch</th>
              </tr>
            </thead>
            <tbody>
              {hot.map((l) => (
                <tr key={l._id} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium">
                    {l.name}
                    {(l.toppedUp || l.placeId?.startsWith("topup:")) && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Sample</span>
                    )}
                  </td>
                  <td className="text-gray-500">{l.industry}</td>
                  <td>
                    <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-[#6d8b00]"><Phone size={13} /> {l.phone}</a>
                  </td>
                  <td className="text-gray-500">{l.assignedTo?.name || l.assignedToName || "—"}</td>
                  <td>
                    {l.research?.pdfUrl ? (
                      <a href={l.research.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-[#0a0a0b] px-2.5 py-1 text-xs font-semibold text-white">
                        <FileText size={13} /> Report
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!hot.length && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No hot leads yet — run ingest.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
