/**
 * Personalized research + pitch for a lead.
 * Strategy (per spec): approach as an interested *customer*, ask about their
 * offering, then ask for their website — if they don't have one, offer to
 * build it with Forwardly. Template-based; swap in an LLM later via the hook.
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

function askFor(industry) {
  const key = (industry || "").toLowerCase();
  return ASK[key] || ASK.default;
}

export function generateResearch(lead) {
  const area = [lead.city, lead.pincode].filter(Boolean).join(" ");
  const ind = lead.industry || "business";
  const ask = askFor(ind);

  let summary;
  const painPoints = [];

  if (lead.classification === "hot") {
    summary = `${lead.name} is a ${ind} in ${area} with ${lead.reviews} Google reviews (${lead.rating || "—"}★) but NO website. High-intent prospect for a new website + online presence.`;
    painPoints.push(
      "No website — invisible to customers who search online",
      "Losing leads to competitors that appear on Google/Maps with a site",
      "No way to showcase work, pricing or collect enquiries 24/7"
    );
  } else if (lead.classification === "medium") {
    summary = `${lead.name} is a ${ind} in ${area} with a website but weak online presence (${lead.reviews} reviews, ${lead.rating || "—"}★). Candidate for a redesign + marketing.`;
    painPoints.push(
      "Existing site likely outdated / not converting",
      "Low review count — weak trust signals",
      "Opportunity: performance, SEO and lead capture upgrade"
    );
  } else {
    summary = `${lead.name} is a ${ind} in ${area} with a website and solid presence (${lead.reviews} reviews, ${lead.rating || "—"}★). Lower priority — nurture only.`;
    painPoints.push("Already established online — long-term nurture");
  }

  const pitch = [
    `Hi, is this ${lead.name}? I was looking for ${ind} in ${area} — do you handle ${ask}?`,
    `Perfect. Quick one — do you have a website where I can check details/pricing?`,
    lead.classification === "hot"
      ? `[If NO] Actually that's why I called — I couldn't find you online. I'm with Forwardly, we build professional websites for ${ind} businesses and can get you live in a few days so customers like me find you easily. Can I WhatsApp you a quick sample + pricing?`
      : `[If weak/old site] I did find it but it looked a bit dated/slow. I'm with Forwardly — we redesign ${ind} websites to load fast and bring in more enquiries. Can I share a quick before/after?`,
  ].join("\n\n");

  return {
    summary,
    pitch,
    painPoints,
    generatedAt: new Date(),
  };
}
