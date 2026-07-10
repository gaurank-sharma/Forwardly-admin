/**
 * Personalized research + pitch for a lead.
 * Strategy: approach as an interested *customer*, ask about their offering,
 * then ask for their website — if they don't have one (or it's weak), reveal
 * honestly that we're Forwardly and offer a FREE demo website first. Pricing is
 * three one-time tiers (9k / 15k / 20k). Covers the common on-call objections
 * and closes by booking the next step / onboarding.
 *
 * Generated in English AND Hinglish (Roman Hindi) as two separate end-to-end
 * blocks, so an agent reads whichever suits the customer. Template-based; swap
 * in an LLM later via generateResearch.
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
  "real estate": "is area mein ek 3BHK rent pe",
  restaurant: "is weekend 6 logon ke liye table aur aapka menu",
  gym: "aapke monthly membership plans",
  salon: "ek bridal package aur aapka rate card",
  clinic: "ek appointment aur aapki consultation fees",
  "interior design": "2BHK interior ka quotation",
  boutique: "aapka latest collection aur prices",
  "coaching institute": "aapki batch timings aur fees",
  cafe: "kya aap party booking lete hain",
  default: "aapki services aur pricing",
};

function askFor(industry) {
  return ASK[(industry || "").toLowerCase()] || ASK.default;
}
function askForHi(industry) {
  return ASK_HI[(industry || "").toLowerCase()] || ASK_HI.default;
}

/** Gurgaon-based leads get the physical-office mention; everyone else stays remote-only. */
function isGurgaon(lead) {
  const hay = `${lead.city || ""} ${lead.pincode || ""} ${lead.address || ""}`.toLowerCase();
  return /gurgaon|gurugram|122\d{3}/.test(hay);
}

function buildPitchEN(lead, ind, area, ask, gurgaon) {
  const reveal =
    lead.classification === "hot"
      ? `[If NO website] Actually that's exactly why I called — I couldn't find you online. Honestly, I'm with Forwardly. We're an agency that builds professional websites for ${ind} businesses so your online presence is strong and customers like me can find you easily — and we can get you live in just a few days.`
      : `[If the site is weak/old] I did find it, but it looked a bit dated and slow to load. Honestly, I'm with Forwardly — we redesign ${ind} websites so they load fast and bring in more enquiries.`;

  const workLine = gurgaon
    ? "Our core team works remotely to keep your cost low — but for Gurgaon clients we also have a physical office at Innov8, Sector 53 Gurgaon (Golf Course Road), if you'd ever like to meet in person or send someone across."
    : "Our core team works remotely to keep your cost low — the whole process (demo, feedback, updates) happens online, so your location is never a constraint.";

  return [
    "OPENING (mystery-shopper — call as an interested customer)",
    `Hi, is this ${lead.name}? I was looking for ${ind} in ${area} — do you handle ${ask}? Could I get a rough quotation?`,
    "",
    "THE WEBSITE BRIDGE",
    "Perfect. Quick one — do you have a website where I can see your previous work or pricing?",
    "",
    "REVEAL + INTEREST CHECK (once they answer about the website)",
    reveal,
    "Would you be interested in hearing a bit more?",
    "[If not interested] -> No problem at all, thank you for your time — have a good day. (Log as not interested, do not push.)",
    "",
    "THE PLAN + FREE DEMO (when they ask \"how much?\")",
    "Before I get to pricing, let me share your personalized plan so it's clear what you'd get.",
    "First, our tech team builds you a FREE demo website. You see the demo — and only if you like it do we move ahead. No advance.",
    "",
    "PRICING — three options (one-time, no hidden cost, domain purchase excluded)",
    "• Starter — Rs. 9,000: our proven website layout with your content, images and small tweaks to fit you. (No admin panel.)",
    "• Premium — Rs. 15,000: a fully custom, premium design built around your brand and needs. (No admin panel — small changes are handled by us.)",
    "• Premium + Admin Panel (recommended) — Rs. 20,000: everything in Premium, plus your own admin panel and backend, so YOU can update photos, prices and content yourself, anytime, without calling a developer.",
    "I'd personally recommend the Admin Panel plan so you're never dependent on us for small changes.",
    "",
    "OUR APPROACH (say this to any lead close to saying yes)",
    "And just so you know how we work — we don't take 50% advance like most agencies. First we understand your business, prepare a quick competitor report and a personalized plan, and even build a demo of your website. Only once you've seen the demo and are happy do we ask you to confirm — and then we onboard you.",
    "",
    "HOW WE WORK",
    workLine,
    "",
    "OBJECTION — \"Call me later / after 5\"",
    "Of course, happy to call back. But before I let you go — 30 seconds: is this something that sounds useful for your business, or would you rather I not follow up at all? [If useful -> continue. If not -> thank them and log.]",
    "",
    "OBJECTION — \"I'm busy right now\"",
    "Totally understand, I'll keep it short. What's a good time today or tomorrow for a quick 2-minute call? [Note the time and set a recall — don't skip it.]",
    "",
    "OBJECTION — \"Where did you get my number?\"",
    `Fair question — I was searching online for the best ${ind} in ${area}, and that's how I came across your business and number. I'm not a random telemarketer — I run a small web studio and only reach out to businesses I think I can genuinely help.`,
    "",
    "OBJECTION — \"It's too expensive\"",
    "I understand — that's why we also have the Starter at Rs. 9,000, and the demo is completely free. You can see the demo without paying anything, then decide.",
    "",
    "CLOSING",
    "So — what's a good time to take this forward, or should I WhatsApp you the sample, competitor report and pricing now, so you can look whenever it's convenient?",
  ].join("\n");
}

function buildPitchHinglish(lead, ind, area, ask, gurgaon) {
  const reveal =
    lead.classification === "hot"
      ? `[Agar website NAHI hai] Actually isiliye maine call kiya — main aapko online dhoond nahi paaya. Honestly, main Forwardly se hoon. Hum ek agency hain jo ${ind} businesses ke liye professional websites banate hain, taaki aapki online presence bane aur mere jaise customers aapko easily dhoond sakein — aur hum kuch hi din mein aapko live kar dete hain.`
      : `[Agar site purani/kamzor hai] Mili to sahi, par thodi purani aur slow lagi. Honestly, main Forwardly se hoon — hum ${ind} websites ko naye sire se, fast aur better banate hain taaki zyada enquiries aayein.`;

  const workLine = gurgaon
    ? "Hamari core team remote kaam karti hai taaki aapki cost kam rahe — par Gurgaon clients ke liye humara physical office bhi hai: Innov8, Sector 53 Gurgaon (Golf Course Road). Aap kabhi milna chahein ya kisi ko bhej dein, welcome hai."
    : "Hamari core team remote kaam karti hai taaki aapki cost kam rahe — demo se leke updates tak sab online hota hai, to location kabhi koi dikkat nahi.";

  return [
    "SHURUAAT (mystery-shopper — interested customer banke call karo)",
    `Hello, kya main ${lead.name} se baat kar raha hoon? Main ${area} mein ${ind} dhoond raha tha — kya aap ${ask} handle karte hain? Ek rough quotation mil sakta hai?`,
    "",
    "WEBSITE BRIDGE",
    "Perfect. Ek quick sawaal — aapki koi website hai jahan main aapka previous kaam ya pricing dekh sakoon?",
    "",
    "REVEAL + INTEREST CHECK (jab wo website ke baare mein jawab dein)",
    reveal,
    "Kya aap aage sunne mein interested honge?",
    "[Agar interested nahi] -> Koi baat nahi, aapke time ke liye shukriya — have a good day. (Not interested log karo, push mat karo.)",
    "",
    "PLAN + FREE DEMO (jab wo poochein \"kitne ka hai?\")",
    "Prices batane se pehle, main aapko aapka personalized plan share karta hoon taaki clear ho ki aapko kya milega.",
    "Sabse pehle hamari tech team aapke liye ek FREE demo website banati hai. Aap demo dekhte ho — agar pasand aaye, tabhi aage badhte hain. Koi advance nahi.",
    "",
    "PRICING — teen options (one-time, no hidden cost, domain purchase alag hai)",
    "• Starter — Rs. 9,000: hamara proven layout, usme aapka content, images aur thodi customization aapke hisaab se. (Admin panel nahi.)",
    "• Premium — Rs. 15,000: fully customized premium site, bilkul aapke brand aur zaroorat ke hisaab se. (Admin panel nahi — chhoti changes hum karte hain.)",
    "• Premium + Admin Panel (recommended) — Rs. 20,000: Premium ki sab cheezein, plus aapka apna admin panel aur backend, taaki aap khud photos, prices aur content kabhi bhi update kar sako, bina developer ko call kiye.",
    "Main personally aapko Admin Panel plan recommend karunga, taaki chhoti changes ke liye aap kabhi hum par dependent na raho.",
    "",
    "HAMARA TARIKA (jo bhi lead haan ke kareeb ho, use zaroor bolo)",
    "Aur jaise hum kaam karte hain — hum 50% advance nahi lete jaise zyada agencies leti hain. Pehle hum aapka business samajhte hain, ek quick competitor report aur personalized plan banate hain, aur aapki website ka demo bana ke dikhate hain. Jab aap demo dekh ke khush ho, tabhi confirm karte ho — phir hum aapko onboard kar dete hain.",
    "",
    "HUM KAISE KAAM KARTE HAIN",
    workLine,
    "",
    "OBJECTION — \"Baad mein call karo / 5 baje ke baad\"",
    "Bilkul, main call back kar lunga. Par jaane se pehle — 30 second: kya ye aapke business ke liye useful lagta hai, ya main follow-up hi na karun? [Useful -> aage badho. Nahi -> shukriya bolo aur log karo.]",
    "",
    "OBJECTION — \"Abhi busy hoon\"",
    "Samajh sakta hoon, main short rakhunga. Aaj ya kal 2-minute ki call ke liye acha time kya rahega? [Time note karo aur recall set karo — skip mat karo.]",
    "",
    "OBJECTION — \"Number kahan se mila?\"",
    `Valid sawaal — main online ${area} mein best ${ind} dhoond raha tha, wahin se aapka business aur number mila. Main koi random telemarketer nahi hoon — ek chhoti web studio chalata hoon aur unhi businesses ko call karta hoon jinki main genuinely madad kar sakoon.`,
    "",
    "OBJECTION — \"Bahut mehenga hai\"",
    "Samajh sakta hoon — isiliye Starter Rs. 9,000 ka bhi hai, aur demo bilkul free hai. Aap bina paisa diye demo dekh lo, phir decide karna.",
    "",
    "CLOSING",
    "Toh — ek acha time bata dijiye jab aage baat kar sakein, ya main abhi aapko WhatsApp pe sample, competitor report aur pricing bhej doon, aap fursat se dekh lena?",
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
  const pitchHi = buildPitchHinglish(lead, ind, area, askHi, gurgaon);

  return {
    summary,
    pitch,
    pitchHi,
    painPoints,
    generatedAt: new Date(),
  };
}
