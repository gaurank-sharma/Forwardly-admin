/**
 * Personalized research + pitch for a lead.
 * Strategy (per spec): approach as an interested *customer*, ask about their
 * offering, then ask for their website — if they don't have one, offer to
 * build it with Forwardly. Covers the common on-call objections (reschedule,
 * "I'm busy", "where did you get my number", pricing) and closes with our
 * working style. Generated in English AND Hindi (kept as two separate blocks,
 * not interleaved, so an agent can read either end-to-end). Template-based;
 * swap in an LLM later via the hook.
 */

const ASK = {
  "real estate": "a 3BHK for rent in this area",
  restaurant: "a table for 6 this weekend and your menu",
  gym: "your monthly membership plans",
  salon: "a bridal package and your rate card",
  clinic: "an appointment and your consultation fees",
  "interior design": "a quote for a 2BHK interior",
  boutique: "your latest collection and prices",
  "coaching institute": "your batch timings and fees",
  cafe: "whether you take party bookings",
  default: "your services and pricing",
};

const ASK_HI = {
  "real estate": "इस इलाके में 3BHK किराए पर",
  restaurant: "इस वीकेंड 6 लोगों के लिए टेबल और आपका मेन्यू",
  gym: "आपकी मंथली मेंबरशिप प्लान्स",
  salon: "ब्राइडल पैकेज और आपका रेट कार्ड",
  clinic: "अपॉइंटमेंट और आपकी कंसल्टेशन फीस",
  "interior design": "2BHK इंटीरियर का कोटेशन",
  boutique: "आपका लेटेस्ट कलेक्शन और कीमतें",
  "coaching institute": "आपकी बैच टाइमिंग्स और फीस",
  cafe: "क्या आप पार्टी बुकिंग लेते हैं",
  default: "आपकी सर्विसेज़ और प्राइसिंग",
};

function askFor(industry) {
  const key = (industry || "").toLowerCase();
  return ASK[key] || ASK.default;
}
function askForHi(industry) {
  const key = (industry || "").toLowerCase();
  return ASK_HI[key] || ASK_HI.default;
}

/** Gurgaon-based leads get the physical-office mention; everyone else stays remote-only. */
function isGurgaon(lead) {
  const hay = `${lead.city || ""} ${lead.pincode || ""} ${lead.address || ""}`.toLowerCase();
  return /gurgaon|gurugram|122\d{3}/.test(hay);
}

function buildPitchEN(lead, ind, area, ask, gurgaon) {
  const reveal =
    lead.classification === "hot"
      ? `[If NO website] Actually that's why I called — I couldn't find you online. I'm with Forwardly, we build professional websites for ${ind} businesses and can get you live in a few days so customers like me find you easily. Can I WhatsApp you a quick sample + pricing?`
      : `[If weak/old site] I did find it, but it looked a bit dated or slow to load. I'm with Forwardly — we redesign ${ind} websites so they load fast and bring in more enquiries. Can I share a quick before/after?`;

  const workLine = gurgaon
    ? "Our core team works remotely to keep costs low for you — but for Gurgaon clients we also have a physical office at Innov8, Sector 53 Gurgaon (Golf Course Road), if you'd ever like to meet in person or send someone across."
    : "Our core team works remotely to keep costs low for you — the whole process (demo, feedback, updates) happens online, so your location is never a constraint.";

  return [
    "OPENING (mystery-shopper — call as an interested customer)",
    `Hi, is this ${lead.name}? I was looking for ${ind} in ${area} — do you handle ${ask}?`,
    "",
    "Perfect. Quick one — do you have a website where I can check details or pricing?",
    "",
    "REVEAL (once they answer about the website)",
    reveal,
    "",
    "OBJECTION 1 — \"Can we connect after 5 / call me later?\"",
    "Of course, no problem at all — happy to call back then. But before I let you go, could I take just 30 seconds? Is this something that actually sounds useful for your business, or would you rather I not follow up at all?",
    "[If useful/willing] -> continue straight into the reveal + pricing above.",
    "[If not interested] -> No worries at all, thank you for your time — have a good day. (Log as not interested, do not push further.)",
    "",
    "OBJECTION 2 — \"I'm busy right now\"",
    "Totally understand, I'll keep it short. What would be a good time today or tomorrow for a quick 2-minute call?",
    "-> Note down the time they give you and set a recall for it — do not skip the callback.",
    "",
    "OBJECTION 3 — \"Where did you get my number?\"",
    `Stay calm and reassure them: No problem at all — I was searching online for the best ${ind} in ${area}, and that's how I came across your business and number. I'm not a random telemarketer — I run a small web studio and only reach out to businesses I think I can genuinely help.`,
    "",
    "PRICING (when they ask \"how much\")",
    "Sure, happy to break it down — no hidden costs, and this excludes domain purchase:",
    "• Basic Website — Rs. 15,000 one-time: 5-page website, built-in SEO, free hosting, and 3 months of support.",
    "• Website + Admin Panel (recommended) — Rs. 20,000 one-time: everything in Basic, plus your own admin panel so YOU can update photos, prices and content yourself, anytime, without calling a developer.",
    "I'd personally recommend the Admin Panel plan so you're never dependent on us for small changes.",
    "",
    "OUR APPROACH (say this to any lead who sounds close to closing)",
    "And just so you know how we work — we don't take 50% advance like most agencies. Before you pay anything, we first understand your business, prepare a quick competitor report and a personalized plan for you, and even build a demo of your website. Only once you've seen the demo and are happy with it do we ask you to confirm and get started.",
    "",
    "HOW WE WORK",
    workLine,
    "",
    "CLOSING",
    "So — what would be a good time to connect and take this forward, or should I WhatsApp you the sample, competitor report and pricing first so you can look at it whenever's convenient?",
  ].join("\n");
}

function buildPitchHI(lead, ind, area, ask, gurgaon) {
  const reveal =
    lead.classification === "hot"
      ? `[अगर वेबसाइट नहीं है] असल में इसीलिए मैंने कॉल किया — मुझे आप ऑनलाइन नहीं मिले। मैं Forwardly से हूं, हम ${ind} बिज़नेस के लिए प्रोफेशनल वेबसाइट बनाते हैं और कुछ ही दिनों में आपको लाइव कर सकते हैं ताकि मेरे जैसे कस्टमर आपको आसानी से ढूंढ पाएं। क्या मैं आपको एक क्विक सैंपल और प्राइसिंग व्हाट्सएप कर सकता/सकती हूं?`
      : `[अगर वेबसाइट पुरानी/कमज़ोर है] मुझे आपकी वेबसाइट मिली, पर वो थोड़ी पुरानी लगी और लोड होने में समय ले रही थी। मैं Forwardly से हूं — हम ${ind} की वेबसाइट को तेज़ और नए सिरे से डिज़ाइन करते हैं ताकि ज़्यादा इंक्वायरी आएं। क्या मैं आपको एक क्विक बिफोर/आफ्टर भेज सकता/सकती हूं?`;

  const workLine = gurgaon
    ? "हमारी कोर टीम रिमोट से काम करती है ताकि आपकी लागत कम रहे — लेकिन गुड़गांव के क्लाइंट्स के लिए हमारा एक ऑफिस भी है: Innov8, सेक्टर 53 गुड़गांव (गोल्फ कोर्स रोड) — अगर आप कभी मिलना चाहें या किसी को भेजना चाहें तो।"
    : "हमारी कोर टीम रिमोट से काम करती है ताकि आपकी लागत कम रहे — डेमो से लेकर अपडेट तक, सब कुछ ऑनलाइन ही होता है, तो लोकेशन कभी कोई दिक्कत नहीं है।";

  return [
    "शुरुआत (मिस्ट्री-शॉपर — एक इंटरेस्टेड कस्टमर की तरह कॉल करें)",
    `नमस्ते, क्या ये ${lead.name} है? मुझे ${area} में ${ind} की ज़रूरत थी — क्या आप ${ask} की सुविधा देते हैं?`,
    "",
    "बढ़िया। एक छोटी सी बात — क्या आपकी कोई वेबसाइट है जहां मैं डिटेल्स या प्राइसिंग देख सकूं?",
    "",
    "रिवील (जब वो वेबसाइट के बारे में जवाब दें)",
    reveal,
    "",
    "आपत्ति 1 — \"क्या हम 5 बजे के बाद बात कर सकते हैं / बाद में कॉल करें?\"",
    "बिल्कुल, कोई दिक्कत नहीं — मैं बाद में कॉल कर लूंगा/लूंगी। पर जाने से पहले, क्या मैं सिर्फ 30 सेकंड ले सकता/सकती हूं? क्या ये आपके बिज़नेस के लिए सच में उपयोगी लग रहा है, या आप चाहेंगे कि मैं दोबारा फॉलो-अप न करूं?",
    "[अगर उपयोगी लगे / तैयार हों] -> सीधे ऊपर वाले रिवील और प्राइसिंग पर जाएं।",
    "[अगर इंटरेस्टेड न हों] -> कोई बात नहीं, आपके समय के लिए धन्यवाद — दिन शुभ हो। (नॉट इंटरेस्टेड के तौर पर नोट करें, ज़बरदस्ती फॉलो-अप न करें।)",
    "",
    "आपत्ति 2 — \"मैं अभी बिज़ी हूं\"",
    "बिल्कुल समझ सकता/सकती हूं, मैं जल्दी बात खत्म करूंगा/करूंगी। आज या कल किस समय 2 मिनट के लिए बात करना ठीक रहेगा?",
    "-> उनका बताया हुआ समय नोट करें और उसी के लिए रीकॉल सेट करें — कॉलबैक मिस न करें।",
    "",
    "आपत्ति 3 — \"आपको मेरा नंबर कहां से मिला?\"",
    `शांत रहें और उन्हें भरोसा दिलाएं: कोई बात नहीं — मैं ऑनलाइन ${area} में सबसे अच्छे ${ind} खोज रहा/रही था/थी, और वहीं से मुझे आपका बिज़नेस और नंबर मिला। मैं कोई रैंडम टेलीमार्केटर नहीं हूं — मैं एक छोटी वेब स्टूडियो चलाता/चलाती हूं और सिर्फ उन्हीं बिज़नेस से संपर्क करता/करती हूं जिनकी मैं असल में मदद कर सकूं।`,
    "",
    "प्राइसिंग (जब वो \"कितना खर्चा होगा\" पूछें)",
    "ज़रूर, मैं पूरी डिटेल बताता/बताती हूं — कोई छुपा हुआ चार्ज नहीं, और ये डोमेन की कीमत को छोड़कर है:",
    "• बेसिक वेबसाइट — ₹15,000 वन-टाइम: 5-पेज वेबसाइट, बिल्ट-इन SEO, फ्री होस्टिंग, और 3 महीने का सपोर्ट।",
    "• वेबसाइट + एडमिन पैनल (हमारी सलाह) — ₹20,000 वन-टाइम: बेसिक की हर चीज़, साथ ही आपका खुद का एडमिन पैनल जिससे आप खुद फोटो, कीमतें और कंटेंट कभी भी बदल सकते हैं, बिना डेवलपर को कॉल किए।",
    "मैं पर्सनली एडमिन पैनल प्लान की सलाह दूंगा/दूंगी ताकि छोटे बदलावों के लिए भी आप हम पर निर्भर न रहें।",
    "",
    "हमारा तरीका (जो भी लीड डील क्लोज़ करने के करीब लगे, उसे ज़रूर बताएं)",
    "और ये भी बता दूं कि हम कैसे काम करते हैं — ज़्यादातर एजेंसियों की तरह हम 50% एडवांस नहीं लेते। पेमेंट से पहले, हम पहले आपका बिज़नेस समझते हैं, एक क्विक कॉम्पिटिटर रिपोर्ट और आपके लिए पर्सनलाइज़्ड प्लान बनाते हैं, और आपकी वेबसाइट का डेमो भी बनाकर दिखाते हैं। जब आप डेमो देखकर खुश हों, तभी हम आपसे कन्फर्म करने को कहते हैं।",
    "",
    "हम कैसे काम करते हैं",
    workLine,
    "",
    "क्लोज़िंग",
    "तो बताइए — इसे आगे बढ़ाने के लिए बात करने का सही समय क्या रहेगा, या मैं पहले आपको सैंपल, कॉम्पिटिटर रिपोर्ट और प्राइसिंग व्हाट्सएप कर दूं ताकि आप जब सुविधाजनक हो तब देख लें?",
  ].join("\n");
}

export function generateResearch(lead) {
  const area = [lead.city, lead.pincode].filter(Boolean).join(" ");
  const ind = lead.industry || "business";
  const ask = askFor(ind);
  const askHi = askForHi(ind);
  const gurgaon = isGurgaon(lead);

  let summary;
  const painPoints = [];

  if (lead.classification === "hot") {
    summary = `${lead.name} is a ${ind} in ${area} with ${lead.reviews} Google reviews (${lead.rating || "—"}/5) but NO website. High-intent prospect for a new website + online presence.`;
    painPoints.push(
      "No website — invisible to customers who search online",
      "Losing leads to competitors that appear on Google/Maps with a site",
      "No way to showcase work, pricing or collect enquiries 24/7"
    );
  } else if (lead.classification === "medium") {
    summary = `${lead.name} is a ${ind} in ${area} with a website but weak online presence (${lead.reviews} reviews, ${lead.rating || "—"}/5). Candidate for a redesign + marketing.`;
    painPoints.push(
      "Existing site likely outdated / not converting",
      "Low review count — weak trust signals",
      "Opportunity: performance, SEO and lead capture upgrade"
    );
  } else {
    summary = `${lead.name} is a ${ind} in ${area} with a website and solid presence (${lead.reviews} reviews, ${lead.rating || "—"}/5). Lower priority — nurture only.`;
    painPoints.push("Already established online — long-term nurture");
  }

  const pitch = buildPitchEN(lead, ind, area, ask, gurgaon);
  const pitchHi = buildPitchHI(lead, ind, area, askHi, gurgaon);

  return {
    summary,
    pitch,
    pitchHi,
    painPoints,
    generatedAt: new Date(),
  };
}
