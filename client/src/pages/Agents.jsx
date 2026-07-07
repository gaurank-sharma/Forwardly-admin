import { useEffect, useState } from "react";
import { Plus, Power, KeyRound, Copy } from "lucide-react";
import api from "../lib/api";

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [show, setShow] = useState(false);
  const [cred, setCred] = useState(null); // { email, password } shown once

  const load = async () => setAgents((await api.get("/agents")).data);
  useEffect(() => { load(); }, []);

  const toggle = async (a) => {
    await api.patch(`/agents/${a.id}/active`, { active: !a.active });
    load();
  };
  const suggest = async () => {
    const { data } = await api.get("/agents/suggest-password");
    setForm((f) => ({ ...f, password: data.password }));
  };
  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/agents", form);
      setCred({ email: data.email, password: data.password });
      setForm({ name: "", email: "", password: "", phone: "" });
      setShow(false);
      load();
    } catch (e) { alert(e.response?.data?.error || "Failed"); }
  };
  const reset = async (a) => {
    if (!confirm(`Reset password for ${a.name}?`)) return;
    const { data } = await api.post(`/agents/${a.id}/reset-password`, {});
    setCred({ email: data.email, password: data.password });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-gray-500">Toggle on/off duty. OFF agents are skipped by auto-assign.</p>
        </div>
        <button className="btn btn-dark" onClick={() => setShow((s) => !s)}><Plus size={16} /> Add agent</button>
      </div>

      {cred && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#c2f54b] bg-[#c2f54b]/10 p-4">
          <KeyRound size={18} className="text-[#6d8b00]" />
          <span className="text-sm">New password for <b>{cred.email}</b>:</span>
          <code className="rounded bg-white px-2 py-1 font-mono text-sm">{cred.password}</code>
          <button onClick={() => navigator.clipboard?.writeText(cred.password)} className="btn btn-ghost px-2 py-1 text-xs"><Copy size={13} /> Copy</button>
          <button onClick={() => setCred(null)} className="ml-auto text-sm text-gray-500">Dismiss</button>
        </div>
      )}

      {show && (
        <form onSubmit={create} className="card mb-5 grid gap-3 p-5 sm:grid-cols-4">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div className="flex gap-2">
            <input className="input" placeholder="Password (blank = auto-strong)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={suggest} className="btn btn-ghost whitespace-nowrap px-3">Suggest</button>
          </div>
          <div className="flex gap-2">
            <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button className="btn btn-primary">Save</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold">{a.name}</div>
                <div className="text-sm text-gray-500">{a.email}</div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${a.active ? "bg-[#c2f54b]/20 text-[#6d8b00]" : "bg-gray-200 text-gray-500"}`}>
                <span className={`h-2 w-2 rounded-full ${a.active ? "bg-[#8ab000]" : "bg-gray-400"}`} /> {a.active ? "ON" : "OFF"}
              </span>
            </div>
            <div className="mt-3 text-sm text-gray-500">{a.assignedToday}/50 today · {a.totalAssigned} total assigned</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => toggle(a)} className={`btn flex-1 justify-center ${a.active ? "btn-ghost" : "btn-primary"}`}>
                <Power size={15} /> {a.active ? "OFF duty" : "ON duty"}
              </button>
              <button onClick={() => reset(a)} className="btn btn-ghost" title="Reset password"><KeyRound size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
