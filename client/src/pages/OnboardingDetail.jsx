import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Plus, Trash2, Save, ExternalLink } from "lucide-react";
import api from "../lib/api";

const PUBLIC_ORIGIN = import.meta.env.VITE_FORWARDLY_SITE_ORIGIN || "https://forwardly.in";
const PROFILE_FIELD_TYPES = ["text", "tel", "email", "textarea"];
const STATUSES = ["draft", "sent", "in_progress", "completed"];
const YES_NO = ["yes", "no"];
const YES_NO_MAYBE = ["yes", "no", "maybe"];

function blankProfileField() {
  return { key: `f_${Date.now()}`, label: "", type: "text", required: true, adminPrefill: null, clientAnswer: null };
}
function blankSection() {
  return {
    key: `s_${Date.now()}`,
    title: "New section",
    description: "",
    imageCount: 0,
    keepAsIs: { adminPrefill: null, clientAnswer: null },
    changeImages: { adminPrefill: null, clientAnswer: null },
    imagesToChange: [],
    imageUploads: [],
    contentChanges: { adminPrefill: null, clientAnswer: null },
  };
}

// Admin's default suggestion vs. the client's actual (editable) answer,
// side by side — both are real inputs now, not a read-only echo.
function GatePair({ label, options, prefill, answer, onPrefill, onAnswer }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-400">Admin prefill</label>
          <select className="input" value={prefill || ""} onChange={(e) => onPrefill(e.target.value || null)}>
            <option value="">None</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6d8b00]">Client's answer (editable)</label>
          <select className="input" style={{ borderColor: "#8fb82e", background: "rgba(194,245,75,0.12)" }} value={answer || ""} onChange={(e) => onAnswer(e.target.value || null)}>
            <option value="">Not answered yet</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function TextPair({ label, help, prefill, answer, onPrefill, onAnswer, multiline }) {
  const Comp = multiline ? "textarea" : "input";
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      {help && <p className="mb-1.5 text-xs text-gray-400">{help}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-400">Admin prefill</label>
          <Comp className="input" rows={multiline ? 2 : undefined} value={prefill ?? ""} onChange={(e) => onPrefill(e.target.value || null)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-[#6d8b00]">Client's answer (editable)</label>
          <Comp
            className="input"
            style={{ borderColor: "#8fb82e", background: "rgba(194,245,75,0.12)" }}
            rows={multiline ? 2 : undefined}
            value={answer ?? ""}
            onChange={(e) => onAnswer(e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
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
      const { profileFields, likesDemo, demoFeedback, sections, plan, projectManager, status, notes, demoUrl } = doc;
      const { data } = await api.patch(`/onboarding/${id}`, {
        profileFields,
        likesDemo,
        demoFeedback,
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

  // ---- profile fields ----
  const updateProfileField = (fi, patch) => {
    setDoc((d) => {
      const profileFields = [...d.profileFields];
      profileFields[fi] = { ...profileFields[fi], ...patch };
      return { ...d, profileFields };
    });
  };
  const removeProfileField = (fi) => setDoc((d) => ({ ...d, profileFields: d.profileFields.filter((_, i) => i !== fi) }));
  const addProfileField = () => setDoc((d) => ({ ...d, profileFields: [...d.profileFields, blankProfileField()] }));

  // ---- sections ----
  const updateSection = (si, patch) => {
    setDoc((d) => {
      const sections = [...d.sections];
      sections[si] = { ...sections[si], ...patch };
      return { ...d, sections };
    });
  };
  const removeSection = (si) => setDoc((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== si) }));
  const addSection = () => setDoc((d) => ({ ...d, sections: [...d.sections, blankSection()] }));

  const toggleImageFlag = (si, n) => {
    setDoc((d) => {
      const sections = [...d.sections];
      const cur = sections[si].imagesToChange || [];
      sections[si] = { ...sections[si], imagesToChange: cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b) };
      return { ...d, sections };
    });
  };
  const updateImageCaption = (si, index, caption) => {
    setDoc((d) => {
      const sections = [...d.sections];
      const imageUploads = sections[si].imageUploads.map((u) => (u.index === index ? { ...u, caption } : u));
      sections[si] = { ...sections[si], imageUploads };
      return { ...d, sections };
    });
  };
  const removeImageUpload = (si, index) => {
    setDoc((d) => {
      const sections = [...d.sections];
      sections[si] = { ...sections[si], imageUploads: sections[si].imageUploads.filter((u) => u.index !== index) };
      return { ...d, sections };
    });
  };

  if (!doc) return <div className="text-sm text-gray-500">Loading…</div>;

  const selectedAgent = agents.find((a) => a.id === (doc.projectManager?._id || doc.projectManager));
  const pmPhone = doc.projectManager?.phone || selectedAgent?.phone || "";

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
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.phone ? ` · ${a.phone}` : ""}</option>)}
          </select>
          {pmPhone && <p className="mt-1 text-xs text-gray-400">Shown to client as their point of contact: {pmPhone}</p>}
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

      {/* ---- Step 1: personal & professional details ---- */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Step 1 · Personal &amp; professional details</h2>
        <button className="btn btn-ghost" onClick={addProfileField}><Plus size={15} /> Add field</button>
      </div>
      <div className="card mb-6 space-y-3 p-5">
        {doc.profileFields.map((f, fi) => (
          <div key={f.key} className="rounded-xl border border-gray-100 p-3">
            <div className="mb-2 flex items-start gap-2">
              <input className="input flex-1" placeholder="Field label" value={f.label} onChange={(e) => updateProfileField(fi, { label: e.target.value })} />
              <select className="input" style={{ width: 120 }} value={f.type} onChange={(e) => updateProfileField(fi, { type: e.target.value })}>
                {PROFILE_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-500">
                <input type="checkbox" checked={!!f.required} onChange={(e) => updateProfileField(fi, { required: e.target.checked })} /> required
              </label>
              <button className="text-gray-300 hover:text-red-500" onClick={() => removeProfileField(fi)}><Trash2 size={15} /></button>
            </div>
            <TextPair
              label=""
              prefill={f.adminPrefill}
              answer={f.clientAnswer}
              onPrefill={(v) => updateProfileField(fi, { adminPrefill: v })}
              onAnswer={(v) => updateProfileField(fi, { clientAnswer: v })}
              multiline={f.type === "textarea"}
            />
          </div>
        ))}
      </div>

      {/* ---- Step 2: do you like the demo? ---- */}
      <div className="mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Step 2 · Demo reaction gate</h2>
      </div>
      <div className="card mb-6 space-y-4 p-5">
        <GatePair
          label={'"Do you like our demo?"'}
          options={YES_NO_MAYBE}
          prefill={doc.likesDemo?.adminPrefill}
          answer={doc.likesDemo?.clientAnswer}
          onPrefill={(v) => setDoc((d) => ({ ...d, likesDemo: { ...d.likesDemo, adminPrefill: v } }))}
          onAnswer={(v) => setDoc((d) => ({ ...d, likesDemo: { ...d.likesDemo, clientAnswer: v } }))}
        />
        <TextPair
          label="What don't you like / what's missing?"
          help={'Shown to the client only if their answer above isn\'t "yes".'}
          prefill={doc.demoFeedback?.adminPrefill}
          answer={doc.demoFeedback?.clientAnswer}
          onPrefill={(v) => setDoc((d) => ({ ...d, demoFeedback: { ...d.demoFeedback, adminPrefill: v } }))}
          onAnswer={(v) => setDoc((d) => ({ ...d, demoFeedback: { ...d.demoFeedback, clientAnswer: v } }))}
          multiline
        />
      </div>

      {/* ---- Step 3+: sections ---- */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Step 3+ · Demo sections (conditional)</h2>
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

            <div className="mb-4 flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-gray-400">Images in this section</label>
              <input
                type="number"
                min={0}
                className="input"
                style={{ width: 80 }}
                value={s.imageCount}
                onChange={(e) => updateSection(si, { imageCount: Math.max(0, Number(e.target.value) || 0) })}
              />
              <span className="text-xs text-gray-400">client will be offered a 1–{s.imageCount || 0} picker if they want changes</span>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 p-3">
                <GatePair
                  label='"Keep this section as-is?"'
                  options={YES_NO}
                  prefill={s.keepAsIs?.adminPrefill}
                  answer={s.keepAsIs?.clientAnswer}
                  onPrefill={(v) => updateSection(si, { keepAsIs: { ...s.keepAsIs, adminPrefill: v } })}
                  onAnswer={(v) => updateSection(si, { keepAsIs: { ...s.keepAsIs, clientAnswer: v } })}
                />
                <p className="mt-1.5 text-xs text-gray-400">If "yes", the client skips straight to the next section — no image/content questions shown.</p>
              </div>

              {s.imageCount > 0 && (
                <div className="rounded-xl border border-gray-100 p-3">
                  <GatePair
                    label='"Want to change the images?"'
                    options={YES_NO}
                    prefill={s.changeImages?.adminPrefill}
                    answer={s.changeImages?.clientAnswer}
                    onPrefill={(v) => updateSection(si, { changeImages: { ...s.changeImages, adminPrefill: v } })}
                    onAnswer={(v) => updateSection(si, { changeImages: { ...s.changeImages, clientAnswer: v } })}
                  />

                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase text-gray-400">
                      Which images are flagged for replacement (editable — admin can flag on the client's behalf too)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: s.imageCount }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleImageFlag(si, n)}
                          className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${
                            (s.imagesToChange || []).includes(n)
                              ? "border-[#8fb82e] bg-[#c2f54b] text-[#0a0a0b]"
                              : "border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {s.imageUploads?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {s.imageUploads.map((u) => (
                        <div key={u.index} className="flex items-start gap-2 rounded-lg border border-gray-100 p-2">
                          <a
                            href={`${api.defaults.baseURL.replace("/api", "")}${u.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-[#6d8b00]"
                          >
                            #{u.index} ↗
                          </a>
                          <input
                            className="input flex-1 text-sm"
                            placeholder="What is this image / where should it go?"
                            value={u.caption || ""}
                            onChange={(e) => updateImageCaption(si, u.index, e.target.value)}
                          />
                          <button className="text-gray-300 hover:text-red-500" onClick={() => removeImageUpload(si, u.index)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-gray-100 p-3">
                <TextPair
                  label="Content / wording changes"
                  prefill={s.contentChanges?.adminPrefill}
                  answer={s.contentChanges?.clientAnswer}
                  onPrefill={(v) => updateSection(si, { contentChanges: { ...s.contentChanges, adminPrefill: v } })}
                  onAnswer={(v) => updateSection(si, { contentChanges: { ...s.contentChanges, clientAnswer: v } })}
                  multiline
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
