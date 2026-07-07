import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "../lib/api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DayConfig() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ weekday: 1, city: "Gurgaon", pincode: "", industry: "", keyword: "" });

  const load = async () => setItems((await api.get("/config")).data);
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    await api.post("/config", { ...form, weekday: Number(form.weekday), active: true });
    setForm({ ...form, pincode: "", industry: "", keyword: "" });
    load();
  };
  const toggle = async (it) => { await api.patch(`/config/${it._id}`, { active: !it.active }); load(); };
  const del = async (it) => { if (confirm("Delete this plan entry?")) { await api.delete(`/config/${it._id}`); load(); } };

  const byDay = DAYS.map((_, wd) => items.filter((i) => i.weekday === wd));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Day Plan</h1>
        <p className="text-sm text-gray-500">Which pincode + industry to mine each weekday. The 3 AM job uses today's entries.</p>
      </div>

      <form onSubmit={add} className="card mb-6 grid gap-3 p-5 md:grid-cols-6">
        <select className="input" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
        <input className="input" placeholder="Industry (e.g. Real Estate)" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} required />
        <input className="input" placeholder="Extra keyword (optional)" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
        <button className="btn btn-primary justify-center"><Plus size={16} /> Add</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {byDay.map((entries, wd) => (
          <div key={wd} className="card p-4">
            <div className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{DAYS[wd]}</div>
            {entries.length === 0 && <div className="text-sm text-gray-400">No plan.</div>}
            {entries.map((it) => (
              <div key={it._id} className="mb-2 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold">{it.industry}</div>
                  <div className="text-xs text-gray-500">{it.city} · {it.pincode}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(it)} className={`rounded-full px-2 py-0.5 text-xs font-bold ${it.active ? "bg-[#c2f54b]/25 text-[#6d8b00]" : "bg-gray-200 text-gray-500"}`}>{it.active ? "ON" : "OFF"}</button>
                  <button onClick={() => del(it)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
