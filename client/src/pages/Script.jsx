import { useState } from "react";
import { Printer, Check, X } from "lucide-react";

/* ---------- content ---------- */
const RULES = [
  ["Be the customer first.", "Sound like an interested buyer, not a vendor."],
  ["Reveal honestly.", "No lies — “honestly, I'm with Forwardly.”"],
  ["Lead with the free demo.", "Offer the free demo website before any price."],
  ["“No” means no.", "Not interested = thank them and stop. Don't push."],
  ["Always a next step.", "Send WhatsApp or set a callback — never leave it open."],
  ["Close on onboarding.", "“We'll onboard you” — confident, like a real company."],
];

const STEPS = [
  {
    n: 1, title: "Opening — call as a customer", sub: "As soon as they pick up, confirm the business",
    blocks: [
      { t: "say", label: "You say",
        hi: "Hello, kya main [Business Name] se baat kar raha hoon? Main Gurgaon 122003 mein [service — jaise 2BHK interior / table for 6] ke liye dhoondh raha tha — kya aap ye handle karte hain? Ek rough quotation mil sakta hai?",
        en: "Hi, is this [Business Name]? I was looking for [service — e.g. a 2BHK interior / a table for 6] in Gurgaon 122003 — do you handle this? Could I get a rough quotation?" },
      { t: "cust", label: "Customer",
        hi: "Haan ji, bilkul — [details deta hai / quotation ki baat karta hai].",
        en: "Yes, sure — [gives details / talks about a quote]." },
      { t: "note", text: "Then move to the website bridge ↓" },
    ],
  },
  {
    n: 2, title: "The website bridge", sub: "Casually ask about their online presence",
    blocks: [
      { t: "say", label: "You say",
        hi: "Perfect. Ek quick sawaal — aapki koi website hai jahan main aapka previous kaam ya pricing dekh sakoon?",
        en: "Perfect. Quick one — do you have a website where I can see your previous work or pricing?" },
      { t: "branch", chips: [["no", "IF “NO” → Step 3"], ["yes", "IF “YES” → objection: already have a site"]] },
    ],
  },
  {
    n: 3, title: "The honest reveal", sub: "When they say there's no website",
    blocks: [
      { t: "say", label: "You say",
        hi: "Actually isiliye call kiya — main aapko online dhoond nahi paaya. Honestly, main Forwardly se hoon. Hum ek agency hain jo businesses ke liye professional websites banate hain — taaki aapki online presence bane aur customers, jaise abhi main, aapko easily dhoond sakein. Aur hum kuch hi din mein aapko live kar dete hain.",
        en: "Actually that's why I called — I couldn't find you online. Honestly, I'm with Forwardly. We're an agency that builds professional websites for businesses — so you have a strong online presence and customers, like me right now, can find you easily. And we can get you live in just a few days." },
      { t: "say", label: "You say — interest check",
        hi: "Kya aap ye aage sunne mein interested honge?",
        en: "Would you be interested in hearing a bit more?" },
      { t: "branch", chips: [["yes", "YES → Step 4"], ["no", "NO → thank & log, don't push"]] },
    ],
  },
  {
    n: 4, title: "Personalized plan + free demo", sub: "When they ask “how much?”",
    blocks: [
      { t: "say", label: "You say — plan first",
        hi: "Prices batane se pehle, main aapko aapka personalized website plan share karta hoon — taaki aapko clear ho ki aapko kya milega.",
        en: "Before I get to pricing, let me share your personalized website plan — so it's clear exactly what you'd get." },
      { t: "free", label: "Always this first",
        hi: "Sabse pehle hamari tech team aapke liye ek FREE demo website banati hai. Aap demo dekhte ho — agar pasand aaye, tabhi aage badhte hain. Koi advance nahi.",
        en: "First, our tech team builds you a FREE demo website. You see the demo — only if you like it do we move ahead. No advance." },
      { t: "tip", text: "Say “tech team” and “free demo” — it makes the company sound bigger and serious, and drops the customer's risk to zero." },
    ],
  },
  {
    n: 5, title: "Three options — 9k / 15k / 20k", sub: "After they like the demo", pricing: true,
    blocks: [
      { t: "say", label: "You say — recommend",
        hi: "Main aapko 20k wala Admin Panel plan recommend karunga — isse aap chhoti changes ke liye kabhi hum par dependent nahi rahoge, sab khud manage kar paoge.",
        en: "I'd recommend the ₹20k Admin Panel plan — that way you're never dependent on us for small changes, you can manage it all yourself." },
      { t: "say", label: "You say — soft close",
        hi: "Aap apna interest bata dijiye — usi hisaab se hum aapko onboard kar dete hain.",
        en: "Just let me know which suits you — and we'll onboard you accordingly." },
    ],
  },
  {
    n: 6, title: "Our approach — trust builder", sub: "Say this to any lead close to yes",
    blocks: [
      { t: "say", label: "You say",
        hi: "Aur jaise hum kaam karte hain — hum 50% advance nahi lete jaise zyada agencies leti hain. Pehle hum aapka business samajhte hain, ek quick competitor report aur personalized plan banate hain, aur aapki website ka demo bana ke dikhate hain. Jab aap demo dekh ke khush ho, tabhi confirm karke shuru karte hain.",
        en: "And just so you know how we work — we don't take 50% advance like most agencies. First we understand your business, prepare a quick competitor report and a personalized plan, and build a demo of your site. Only once you've seen the demo and are happy do we ask you to confirm and start." },
    ],
  },
  {
    n: 7, title: "How we work — remote + office", sub: "If they ask about location / trust",
    blocks: [
      { t: "say", label: "You say",
        hi: "Hamari core team remote kaam karti hai taaki aapki cost kam rahe — par Gurgaon clients ke liye humara physical office bhi hai: Innov8, Sector 53 Gurgaon (Golf Course Road). Aap kabhi bhi milna chahein ya kisi ko bhej dein, welcome hai.",
        en: "Our core team works remotely to keep your cost low — but for Gurgaon clients we also have a physical office: Innov8, Sector 53 Gurgaon (Golf Course Road). You're welcome to meet in person or send someone across anytime." },
    ],
  },
  {
    n: 8, title: "The close", sub: "Always end with a next step",
    blocks: [
      { t: "say", label: "You say",
        hi: "Toh — ek acha time bata dijiye jab detail mein baat kar sakein? Ya main abhi aapko WhatsApp pe sample, competitor report aur pricing bhej doon, aap fursat se dekh lena?",
        en: "So — what's a good time to talk in detail? Or shall I WhatsApp you the sample, competitor report and pricing right now, so you can look whenever it's convenient?" },
      { t: "tip", text: "If they give a callback time, set a recall in the CRM. If they choose WhatsApp, send the sample + pricing immediately, while it's fresh." },
    ],
  },
];

const TIERS = [
  { price: "₹9,000", name: "Starter — ready layout",
    inc: ["Proven layout", "Your content & images", "Small customization", "Free demo first"], exc: ["Full custom design", "Admin panel"] },
  { price: "₹15,000", name: "Premium — fully custom",
    inc: ["Fully custom premium site", "Built around your brand", "Better UI/UX & polish", "Free demo first"], exc: ["Admin panel (we edit)"] },
  { price: "₹20,000", name: "Premium + Admin Panel", rec: true,
    inc: ["Everything in Premium", "Admin panel + backend", "Update content yourself", "No developer needed", "Free demo first"], exc: [] },
];

const OBJ = [
  { q: ["Baad mein baat karein / 5 baje ke baad", "Call me later / after 5"],
    a: ["Bilkul, main call back kar lunga. Bas 30 second — kya ye aapke business ke liye useful lagta hai, ya main follow up hi na karun?",
        "Of course, happy to call back. Just 30 seconds — does this sound useful for your business, or would you rather I don't follow up at all?"],
    meta: "Useful → reveal + pricing now.  No → thank & stop." },
  { q: ["Abhi busy hoon", "I'm busy right now"],
    a: ["Samajh sakta hoon, main short rakhunga. Aaj ya kal 2-minute ki call ke liye acha time kya rahega?",
        "Totally understand, I'll keep it short. What's a good time today or tomorrow for a quick 2-minute call?"],
    meta: "Note the time → set a recall, don't skip it." },
  { q: ["Number kahan se mila?", "Where did you get my number?"],
    a: ["Valid sawaal — main online Gurgaon mein best [service] dhoond raha tha, wahan aapka business aaya. Main random telemarketer nahi hoon, ek chhoti web studio chalata hoon aur unhi businesses ko call karta hoon jinki main genuinely madad kar sakoon.",
        "Fair question — I was searching online for the best [service] in Gurgaon and came across your business. I'm not a random telemarketer — I run a small web studio and only reach out to businesses I can genuinely help."],
    meta: "Stay calm, don't get defensive." },
  { q: ["Already website hai", "I already have a website"],
    a: ["Great! Main ek baar dekh loon? Agar improve karne ki gunjaish hui toh free demo bana ke dikha deta hoon — no obligation, aap compare kar lena.",
        "Great! Can I take a look? If there's room to improve, I'll build a free demo so you can compare — no obligation."],
    meta: "Ask for the link, quick audit, offer free demo." },
  { q: ["Sochna padega / abhi nahi", "I need to think / not now"],
    a: ["Bilkul, koi jaldi nahi. Main sample aur pricing WhatsApp pe bhej deta hoon, aap fursat se dekh lena. 2-3 din baad ek quick follow-up kar loon?",
        "Of course, no rush. I'll WhatsApp you the sample and pricing to look at whenever. Can I do a quick follow-up in 2-3 days?"],
    meta: "Send WhatsApp + set a soft recall." },
  { q: ["Bahut mehenga hai", "It's too expensive"],
    a: ["Samajh sakta hoon — isiliye 9k ka Starter bhi hai, aur demo bilkul free hai. Aap bina paisa diye demo dekh lo, phir decide karna.",
        "I understand — that's why there's the ₹9k Starter, and the demo is completely free. See the demo without paying anything, then decide."],
    meta: "Move to 9k, repeat the free demo." },
];

const DO = ["Start natural, as a customer", "Reveal honestly & confidently", "Lead with the free demo", "Set a next step / recall every call", "Close with “we'll onboard you”"];
const DONT = ["Read the script like a robot", "Push after “not interested”", "Ask for advance / money first", "Skip the callback time", "Get defensive about the number"];

/* ---------- small blocks ---------- */
function Say({ label, children }) {
  return (
    <div className="rounded-xl border-l-[3px] border-[#9cc400] bg-[#f4fae0] p-3.5">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#5f7a00]">{label}</div>
      <p className="m-0 text-[15px] font-medium text-gray-800">{children}</p>
    </div>
  );
}
function Cust({ label, children }) {
  return (
    <div className="rounded-xl border-l-[3px] border-gray-300 bg-gray-50 p-3.5">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <p className="m-0 text-sm text-gray-600">{children}</p>
    </div>
  );
}
function Free({ label, children }) {
  return (
    <div className="rounded-xl border border-[#c2f54b] bg-[#eef8cf] p-4">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#5f7a00]">{label}</div>
      <p className="m-0 text-[15px] font-medium text-gray-800">{children}</p>
    </div>
  );
}
function Tip({ children }) {
  return (
    <div className="rounded-xl border-l-[3px] border-amber-400 bg-amber-50 p-3.5">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-600">Tip</div>
      <p className="m-0 text-sm text-amber-800">{children}</p>
    </div>
  );
}

export default function Script() {
  const [lang, setLang] = useState("hi");
  const t = (hi, en) => (lang === "en" ? en : hi);

  return (
    <div className="mx-auto max-w-3xl">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Script</h1>
          <p className="text-sm text-gray-500">Call as a customer, reveal honestly, lead with a free demo, always book the next step.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
            <button onClick={() => setLang("hi")} className={`rounded-full px-3.5 py-1 text-xs font-bold ${lang === "hi" ? "bg-[#c2f54b] text-[#0a0a0b]" : "text-gray-500"}`}>Hinglish</button>
            <button onClick={() => setLang("en")} className={`rounded-full px-3.5 py-1 text-xs font-bold ${lang === "en" ? "bg-[#c2f54b] text-[#0a0a0b]" : "text-gray-500"}`}>English</button>
          </div>
          <button onClick={() => window.print()} className="btn btn-ghost"><Printer size={15} /> Print</button>
        </div>
      </div>

      {/* golden rules */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {RULES.map(([h, d], i) => (
          <div key={i} className="card flex gap-3 p-3.5">
            <span className="text-sm font-bold text-[#6b8500]">{String(i + 1).padStart(2, "0")}</span>
            <p className="m-0 text-sm text-gray-600"><b className="text-gray-900">{h}</b> {d}</p>
          </div>
        ))}
      </div>

      {/* steps */}
      <div className="flex flex-col gap-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[#c2f54b] font-bold text-[#0a0a0b]">{s.n}</span>
              <div>
                <h2 className="text-lg font-bold leading-tight">{s.title}</h2>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {s.blocks.map((b, i) => {
                if (b.t === "say") return <Say key={i} label={b.label}>{t(b.hi, b.en)}</Say>;
                if (b.t === "cust") return <Cust key={i} label={b.label}>{t(b.hi, b.en)}</Cust>;
                if (b.t === "free") return <Free key={i} label={b.label}>{t(b.hi, b.en)}</Free>;
                if (b.t === "tip") return <Tip key={i}>{b.text}</Tip>;
                if (b.t === "note") return <p key={i} className="pt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{b.text}</p>;
                if (b.t === "branch")
                  return (
                    <div key={i} className="flex flex-wrap gap-2 pt-0.5">
                      {b.chips.map(([tone, txt], j) => (
                        <span key={j} className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${tone === "yes" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-600"}`}>{txt}</span>
                      ))}
                    </div>
                  );
                return null;
              })}

              {/* pricing tiers inside step 5, above the recommend line */}
              {s.pricing && (
                <div className="my-1">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">One-time · no hidden cost · domain excluded</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {TIERS.map((tier) => (
                      <div key={tier.price} className={`relative rounded-xl border p-4 ${tier.rec ? "border-[#c2f54b] bg-[#f7fce6] shadow-[0_0_0_1px_#c2f54b]" : "border-gray-200 bg-gray-50"}`}>
                        {tier.rec && <span className="absolute -top-2 right-3 rounded-full bg-[#c2f54b] px-2 py-0.5 text-[9px] font-bold uppercase text-[#0a0a0b]">Recommend</span>}
                        <div className="text-xl font-extrabold">{tier.price}</div>
                        <div className="mb-2 text-xs font-semibold text-gray-500">{tier.name}</div>
                        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                          {tier.inc.map((x) => (
                            <li key={x} className="flex items-start gap-1.5 text-xs text-gray-600"><Check size={12} className="mt-0.5 flex-none text-[#6b8500]" /> {x}</li>
                          ))}
                          {tier.exc.map((x) => (
                            <li key={x} className="flex items-start gap-1.5 text-xs text-gray-400"><X size={12} className="mt-0.5 flex-none text-red-400" /> {x}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* objections */}
      <h2 className="mb-3 mt-8 text-xl font-bold">Objection handling</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {OBJ.map((o, i) => (
          <div key={i} className="card p-4">
            <p className="m-0 text-sm font-bold text-gray-900">“{t(o.q[0], o.q[1])}”</p>
            <p className="mt-2 text-sm text-gray-600"><span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6b8500]">You say · </span>{t(o.a[0], o.a[1])}</p>
            <p className="mt-2 text-xs font-semibold text-amber-600">{o.meta}</p>
          </div>
        ))}
      </div>

      {/* quick reference */}
      <h2 className="mb-3 mt-8 text-xl font-bold">Quick reference</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
            <tr><th className="px-4 py-3">Plan</th><th>Price</th><th>Best for</th><th>Admin panel</th></tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100"><td className="px-4 py-3 font-bold">Starter</td><td>₹9,000</td><td className="text-gray-500">Ready layout + your content</td><td className="text-gray-500">No</td></tr>
            <tr className="border-t border-gray-100"><td className="px-4 py-3 font-bold">Premium</td><td>₹15,000</td><td className="text-gray-500">Fully custom design</td><td className="text-gray-500">No</td></tr>
            <tr className="border-t border-gray-100"><td className="px-4 py-3 font-bold text-[#6b8500]">Premium + Admin</td><td>₹20,000</td><td className="text-gray-500">Self-manage content</td><td className="text-gray-500">Yes</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-green-700">Do</div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {DO.map((x) => <li key={x} className="flex items-start gap-2 text-sm text-gray-700"><Check size={14} className="mt-0.5 flex-none text-green-600" /> {x}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-red-600">Don't</div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {DONT.map((x) => <li key={x} className="flex items-start gap-2 text-sm text-gray-700"><X size={14} className="mt-0.5 flex-none text-red-500" /> {x}</li>)}
          </ul>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">Forwardly — internal agent playbook · Prices one-time, domain excluded · Office: Innov8, Sector 53, Gurgaon</p>
    </div>
  );
}
