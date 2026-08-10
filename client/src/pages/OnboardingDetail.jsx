import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Plus, Trash2, Save, ExternalLink } from "lucide-react";
import api from "../lib/api";

const PUBLIC_ORIGIN = import.meta.env.VITE_FORWARDLY_SITE_ORIGIN || "https://forwardly.in";
const QUESTION_TYPES = ["yesno", "yesnomaybe", "text", "number", "upload", "multiupload"];
const STATUSES = ["draft", "sent", "in_progress", "completed"];

function blankQuestion() {
  return { key: `q_${Date.now()}`, label: "", type: "yesnomaybe", helpText: "", adminPrefill: null, clientAnswer: null, uploads: [] };
}
function blankSection() {
  return { key: `s_${Date.now()}`, title: "New section", description: "", questions: [blankQuestion()] };
}

export default function OnboardingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [agents, setAgents] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => setDoc((await api.get(`/onboarding/${id}`)).data);
  useEffect(() => {
    load();
    api.get("/agents").then((r) => setAgents(r.data));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const { sections, plan, projectManager, status, notes, demoUrl } = doc;
      const { data } = await api.patch(`/onboarding/${id}`, {
        sections,
        plan,
        projectManager: projectManager?._id || projectManager || null,
        status,
        notes,
        demoUrl,
      });
      setDoc(data);
      alert("Saved");
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${PUBLIC_ORIGIN}/onboarding/${doc.token}`);
    alert("Link copied");
  };

  const updateSection = (si, patch) => {
    setDoc((d) => {
      const sections = [...d.sections];
      sections[si] = { ...sections[si], ...patch };
      return { ...d, sections };
    });
  };
  const updateQuestion = (si, qi, patch) => {
    setDoc((d) => {
      const sections = [...d.sections];
      const questions = [...sections[si].questions];
      questions[qi] = { ...questions[qi], ...patch };
      sections[si] = { ...sections[si], questions };
      return { ...d, sections };
    });
  };
  const removeQuestion = (si, qi) => {
    setDoc((d) => {
      const sections = [...d.sections];
      sections[si] = { ...sections[si], questions: sections[si].questions.filter((_, i) => i !== qi) };
      return { ...d, sections };
    });
  };
  const addQuestion = (si) => updateSection(si, { questions: [...doc.sections[si].questions, blankQuestion()] });
  const removeSection = (si) => setDoc((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== si) }));
  const addSection = () => setDoc((d) => ({ ...d, sections: [...d.sections, blankSection()] }));

  if (!doc) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div>
      <button onClick={() => navigate("/onboarding")} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} /> All onboardings
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{doc.clientName}</h1>
          <p className="text-sm text-gray-500">{doc.lead?.phone} · {doc.lead?.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={copyLink}><Copy size={16} /> Copy client link</button>
          <a href={`${PUBLIC_ORIGIN}/onboarding/${doc.token}`} target="_blank" rel="noreferrer" className="btn btn-ghost"><ExternalLink size={16} /></a>
          <button className="btn btn-dark" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </div>

      <div className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-400">Plan</label>
          <select className="input" value={doc.plan} onChange={(e) => setDoc({ ...doc, plan: e.target.value })}>
            <option value="9k">₹9,000</option>
            <option value="15k">₹15,000</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-400">Status</label>
          <select className="input" value={doc.status} onChange={(e) => setDoc({ ...doc, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-400">Project manager</label>
          <select
            className="input"
            value={doc.projectManager?._id || doc.projectManager || ""}
            onChange={(e) => setDoc({ ...doc, projectManager: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-400">Demo URL</label>
          <input className="input" placeholder="https://…" value={doc.demoUrl || ""} onChange={(e) => setDoc({ ...doc, demoUrl: e.target.value })} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="mb-1 block text-xs font-semibold uppercase text-gray-400">Internal notes</label>
          <textarea className="input" rows={2} value={doc.notes || ""} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Sections</h2>
        <button className="btn btn-ghost" onClick={addSection}><Plus size={15} /> Add section</button>
      </div>

      <div className="space-y-4">
        {doc.sections.map((s, si) => (
          <div key={s.key} className="card p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <input className="input font-semibold" value={s.title} onChange={(e) => updateSection(si, { title: e.target.value })} />
                <input className="input text-sm text-gray-500" placeholder="Description shown to client" value={s.description} onChange={(e) => updateSection(si, { description: e.target.value })} />
              </div>
              <button className="text-gray-300 hover:text-red-500" onClick={() => removeSection(si)}><Trash2 size={16} /></button>
            </div>

            <div className="space-y-3">
              {s.questions.map((q, qi) => (
                <div key={q.key} className="rounded-xl border border-gray-100 p-3">
                  <div className="mb-2 flex items-start gap-2">
                    <input className="input flex-1" placeholder="Question label" value={q.label} onChange={(e) => updateQuestion(si, qi, { label: e.target.value })} />
                    <select className="input" style={{ width: 130 }} value={q.type} onChange={(e) => updateQuestion(si, qi, { type: e.target.value })}>
                      {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button className="text-gray-300 hover:text-red-500" onClick={() => removeQuestion(si, qi)}><Trash2 size={15} /></button>
                  </div>
                  <input className="input mb-2 text-sm" placeholder="Help text (optional)" value={q.helpText || ""} onChange={(e) => updateQuestion(si, qi, { helpText: e.target.value })} />

                  {(q.type === "yesno" || q.type === "yesnomaybe") && (
                    <select className="input" style={{ width: 200 }} value={q.adminPrefill || ""} onChange={(e) => updateQuestion(si, qi, { adminPrefill: e.target.value || null })}>
                      <option value="">No prefill</option>
                      <option value="yes">Prefill: Yes</option>
                      {q.type === "yesnomaybe" && <option value="maybe">Prefill: Maybe</option>}
                      <option value="no">Prefill: No</option>
                    </select>
                  )}
                  {(q.type === "text" || q.type === "number") && (
                    <input
                      className="input"
                      type={q.type === "number" ? "number" : "text"}
                      placeholder="Prefill value (editable by client)"
                      value={q.adminPrefill ?? ""}
                      onChange={(e) => updateQuestion(si, qi, { adminPrefill: e.target.value || null })}
                    />
                  )}

                  {q.clientAnswer !== null && q.clientAnswer !== undefined && (
                    <div className="mt-2 rounded-lg bg-[#c2f54b]/15 px-2.5 py-1.5 text-xs font-medium text-[#5f7a00]">
                      Client answered: {String(q.clientAnswer)}
                    </div>
                  )}
                  {q.uploads?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.uploads.map((u) => (
                        <a key={u} href={`${api.defaults.baseURL.replace("/api", "")}${u}`} target="_blank" rel="noreferrer" className="rounded bg-gray-100 px-2 py-1 text-xs text-[#6d8b00]">
                          {u.split("/").pop()}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button className="text-xs font-semibold text-[#6d8b00]" onClick={() => addQuestion(si)}>+ Add question</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
