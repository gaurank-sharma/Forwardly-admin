import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, "../assets/fonts");
const F = {
  serif: path.join(FONT_DIR, "PlayfairDisplay-Regular.ttf"),
  serifBold: path.join(FONT_DIR, "PlayfairDisplay-Bold.ttf"),
  serifItalic: path.join(FONT_DIR, "PlayfairDisplay-Italic.ttf"),
  sans: path.join(FONT_DIR, "Inter-Regular.ttf"),
  sansMed: path.join(FONT_DIR, "Inter-SemiBold.ttf"),
  sansBold: path.join(FONT_DIR, "Inter-Bold.ttf"),
};

// palette — warm cream / gold editorial look (matches the sample_prices.pdf template)
const CREAM = "#fbf9f4";
const INK = "#1c1a16";
const GOLD = "#a6824c";
const GOLD_LINE = "#cbab74";
const GOLD_BG = "#efe8d8";
const GRAY = "#726d63";
const DARK = "#17140f";
const LIME = "#c2f54b";

const MARGIN = 48;

function registerFonts(doc) {
  doc.registerFont("Serif", F.serif);
  doc.registerFont("Serif-Bold", F.serifBold);
  doc.registerFont("Serif-Italic", F.serifItalic);
  doc.registerFont("Sans", F.sans);
  doc.registerFont("Sans-Med", F.sansMed);
  doc.registerFont("Sans-Bold", F.sansBold);
}

function background(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(CREAM);
}

/** small rounded pill — filled (solid gold) or outlined (cream w/ gold border) */
function pill(doc, text, x, y, { filled = false, fontSize = 7 } = {}) {
  doc.font("Sans-Bold").fontSize(fontSize);
  const padX = 9, h = 16;
  const w = doc.widthOfString(text, { characterSpacing: 0.5 }) + padX * 2;
  doc.roundedRect(x, y, w, h, h / 2);
  if (filled) doc.fill(GOLD);
  else doc.lineWidth(0.75).stroke(GOLD_LINE);
  doc.fillColor(filled ? "#ffffff" : GOLD).text(text, x, y + 4.5, { width: w, align: "center", characterSpacing: 0.5 });
  return w;
}

function logoMark(doc, x, y) {
  doc.roundedRect(x, y, 22, 22, 6).fill(DARK);
  doc.fillColor(LIME).font("Sans-Bold").fontSize(13).text("F", x, y + 4, { width: 22, align: "center" });
}

/** shared top chrome for pages 2-4: wordmark left, running title right, thin rule */
function chrome(doc, rightLabel) {
  const top = 50;
  doc.fillColor(INK).font("Sans-Bold").fontSize(9).text("FORWARDLY", MARGIN, top, { characterSpacing: 1.5 });
  doc.fillColor(GOLD).font("Sans-Bold").fontSize(8.5).text(rightLabel.toUpperCase(), MARGIN, top + 1, {
    width: doc.page.width - MARGIN * 2, align: "right", characterSpacing: 1,
  });
  doc.moveTo(MARGIN, top + 20).lineTo(doc.page.width - MARGIN, top + 20).lineWidth(0.75).stroke(GOLD_LINE);
  return top + 44;
}

function footer(doc, text) {
  doc.fillColor(GRAY).font("Sans-Bold").fontSize(7.5).text(text.toUpperCase(), MARGIN, doc.page.height - 56, {
    width: doc.page.width - MARGIN * 2, align: "center", characterSpacing: 1.2,
  });
}

function calloutBox(doc, y, height, title, body) {
  const w = doc.page.width - MARGIN * 2;
  doc.roundedRect(MARGIN, y, w, height, 10).fill(GOLD_BG);
  doc.rect(MARGIN, y, 3, height).fill(GOLD);
  doc.fillColor(INK).font("Serif").fontSize(14).text(title, MARGIN + 24, y + 18);
  doc.fillColor(GRAY).font("Sans").fontSize(9.5).text(body, MARGIN + 24, doc.y + 6, { width: w - 48, lineGap: 3 });
}

// ---------------------------------------------------------------- page 1
function coverPage(doc, name) {
  background(doc);
  doc.roundedRect(20, 20, doc.page.width - 40, doc.page.height - 40, 2).lineWidth(1).stroke(GOLD_LINE);

  const cx = doc.page.width / 2;
  let y = 78;
  logoMark(doc, cx - 60, y);
  doc.fillColor(INK).font("Sans-Bold").fontSize(15).text("FORWARDLY", cx - 32, y + 3, { characterSpacing: 2 });

  y += 46;
  doc.fillColor(GOLD).font("Serif-Italic").fontSize(11).text("presents a personalized proposal for", 0, y, {
    width: doc.page.width, align: "center",
  });

  y += 90;
  doc.fillColor(INK).font("Serif-Bold").fontSize(32).text(name, MARGIN, y, {
    width: doc.page.width - MARGIN * 2, align: "center",
  });

  y = doc.y + 40;
  doc.moveTo(cx - 60, y).lineTo(cx + 60, y).lineWidth(1).stroke(GOLD_LINE);

  y += 30;
  doc.fillColor(INK).font("Serif-Bold").fontSize(23).text("The Website Package", 0, y, { width: doc.page.width, align: "center" });
  doc.fillColor(GRAY).font("Serif-Italic").fontSize(11).text("Your complete digital home — designed, built, and cared for.", 0, doc.y + 8, {
    width: doc.page.width, align: "center",
  });

  y = doc.y + 26;
  doc.fillColor(GOLD).font("Sans-Bold").fontSize(8.5).text("PREMIUM WEBSITE  ·  ADMIN PORTAL  ·  HOSTING", 0, y, {
    width: doc.page.width, align: "center", characterSpacing: 1,
  });
  doc.text("SEO  ·  LOGO  ·  3 MONTHS FREE SUPPORT", 0, doc.y + 6, {
    width: doc.page.width, align: "center", characterSpacing: 1,
  });

  // bottom block
  const by = doc.page.height - 170;
  doc.fillColor(GOLD).font("Sans-Bold").fontSize(8).text("PREPARED FOR", 0, by, { width: doc.page.width, align: "center", characterSpacing: 1.2 });
  doc.fillColor(INK).font("Serif").fontSize(13).text(name, 0, doc.y + 4, { width: doc.page.width, align: "center" });

  doc.moveTo(cx - 40, doc.y + 16).lineTo(cx + 40, doc.y + 16).lineWidth(0.75).stroke(GOLD_LINE);

  doc.fillColor(INK).font("Serif-Italic").fontSize(10.5).text("Your Vision. Our Execution.", 0, doc.y + 26, { width: doc.page.width, align: "center" });
  doc.fillColor(GRAY).font("Sans-Bold").fontSize(7.5).text("FORWARDLY  ·  forwardly.in", 0, doc.y + 6, {
    width: doc.page.width, align: "center", characterSpacing: 1,
  });
}

// ---------------------------------------------------------------- page 2
function featuresPage(doc, name) {
  background(doc);
  let y = chrome(doc, `Website Package — ${name}`);

  doc.fillColor(INK).font("Serif-Bold").fontSize(25).text("Everything in your package", MARGIN, y);
  doc.fillColor(GRAY).font("Serif-Italic").fontSize(10.5).text(
    "Everything below is included — the admin portal comes with the Complete pack.",
    MARGIN, doc.y + 6
  );

  y = doc.y + 26;
  const items = [
    ["PREMIUM WEBSITE — DESIGN & DEVELOPMENT", "A bespoke, mobile-perfect website crafted around your portfolio and brand.", null],
    ["ADMIN PORTAL (CMS)", "Update images, projects and text yourself — no developer needed, ever.", { text: "COMPLETE PACK", filled: false }],
    ["SEO SETUP", "On-page SEO so clients searching for your business actually find you.", null],
    ["PREMIUM HOSTING — 1 YEAR", "Fast, secure hosting with SSL — fully managed by us.", { text: "INCLUDED FREE", filled: false }],
    ["CUSTOM LOGO DESIGN", `A custom logo designed for ${name} — included at no cost.`, { text: "FREE GIFT", filled: true }],
    ["FREE SUPPORT — 3 MONTHS", "Post-launch help, fixes and small tweaks — on us for your first three months.", { text: "INCLUDED FREE", filled: false }],
  ];

  items.forEach(([title, desc, badge], i) => {
    const num = String(i + 1).padStart(2, "0");
    const rowY = y;
    doc.fillColor(GOLD).font("Serif").fontSize(12).text(num, MARGIN, rowY);
    doc.fillColor(INK).font("Sans-Bold").fontSize(10.5).text(title, MARGIN + 36, rowY, { characterSpacing: 0.3 });
    if (badge) {
      const w = doc.font("Sans-Bold").fontSize(7).widthOfString(badge.text, { characterSpacing: 0.5 }) + 18;
      pill(doc, badge.text, doc.page.width - MARGIN - w, rowY - 2, { filled: badge.filled });
    }
    doc.fillColor(GRAY).font("Sans").fontSize(9.5).text(desc, MARGIN + 36, doc.y + 2, { width: doc.page.width - MARGIN * 2 - 36 });
    y = doc.y + 18;
  });

  calloutBox(doc, y + 6, 92, "A note on your domain",
    "Use your own domain — whether you already own one or plan to buy it separately. " +
    "We will connect it to your new website and set everything up for you at launch."
  );

  footer(doc, "Forwardly · Research — Plan — Implement · Page 2 of 4");
}

// ---------------------------------------------------------------- page 3
function pricingPage(doc, name) {
  background(doc);
  let y = chrome(doc, `Website Package — ${name}`);

  doc.fillColor(INK).font("Serif-Bold").fontSize(25).text("Choose your package", MARGIN, y);
  doc.fillColor(GRAY).font("Serif-Italic").fontSize(10.5).text(
    "From a quick sample to a fully bespoke build — pick what fits your timeline.",
    MARGIN, doc.y + 6
  );

  const topY = doc.y + 24;
  const gap = 14;
  const cardW = (doc.page.width - MARGIN * 2 - gap * 2) / 3;
  const cardH = 250;

  const cards = [
    {
      name: "SAMPLE LAYOUT", price: "₹9,000", badge: "BEST VALUE", dark: false,
      items: [
        "The layout we already shared — no new design work",
        "Minor edits — your text, images, colors, logo",
        "Premium hosting — 1 year, free",
        "Live in 2–3 days",
      ],
      faded: ["Admin portal — not included", "Custom redesign — not included"],
    },
    {
      name: "ESSENTIAL", price: "₹15,000", badge: null, dark: false,
      items: [
        "Premium website — design & development",
        "SEO setup",
        "Premium hosting — 1 year, free",
        "Custom logo design — free gift",
        "Free support — 3 months",
      ],
      faded: ["Admin portal (CMS) — not included"],
    },
    {
      name: "COMPLETE", price: "₹20,000", badge: "RECOMMENDED", dark: true,
      items: [
        "Admin portal (CMS) — update it yourself",
        "Premium website — design & development",
        "SEO setup",
        "Premium hosting — 1 year, free",
        "Custom logo design — free gift",
        "Free support — 3 months",
      ],
      faded: [],
    },
  ];

  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + gap);
    doc.roundedRect(x, topY, cardW, cardH, 10);
    if (c.dark) doc.fill(DARK);
    else { doc.lineWidth(1).stroke(GOLD_LINE); }

    const textColor = c.dark ? "#ffffff" : INK;
    const mutedColor = c.dark ? "#b9b6ad" : GRAY;
    const bulletColor = c.dark ? LIME : GOLD;

    // badge floats above the card so it never competes with the name label
    // for space on narrow (3-up) columns
    if (c.badge) {
      const w = doc.font("Sans-Bold").fontSize(7).widthOfString(c.badge, { characterSpacing: 0.5 }) + 18;
      pill(doc, c.badge, x + cardW - w - 12, topY - 9, { filled: true });
    }

    let iy = topY + 20;
    doc.fillColor(c.dark ? "#c9bfa4" : GOLD).font("Sans-Bold").fontSize(8.5).text(c.name, x + 18, iy, { width: cardW - 36, characterSpacing: 1 });
    iy = doc.y + 6;
    doc.fillColor(textColor).font("Serif-Bold").fontSize(21).text(c.price, x + 18, iy);
    iy = doc.y + 14;
    doc.font("Sans").fontSize(8.7);
    c.items.forEach((t) => {
      // two independent absolute-positioned calls (not `continued`) — continued
      // text here was ignoring the column width and bleeding into the next card
      doc.fillColor(bulletColor).text("•", x + 18, iy);
      doc.fillColor(textColor).text(t, x + 28, iy, { width: cardW - 46, lineGap: 2 });
      iy = doc.y + 4;
    });
    c.faded.forEach((t) => {
      doc.fillColor(mutedColor).font("Sans").fontSize(8.2).text("—  " + t, x + 18, iy, { width: cardW - 36, lineGap: 2 });
      iy = doc.y + 4;
    });
  });

  y = topY + cardH + 22;
  doc.fillColor(GRAY).font("Sans-Med").fontSize(9).text(
    "One-time payment  ·  No hidden costs  ·  Nothing extra to buy",
    0, y, { width: doc.page.width, align: "center" }
  );

  y = doc.y + 22;
  doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(0.75).stroke(GOLD_LINE);
  y += 20;

  doc.fillColor(INK).font("Serif-Bold").fontSize(19).text("What happens next", MARGIN, y);
  y = doc.y + 18;

  const steps = [
    ["Pick your package", "Choose Sample, Essential or Complete — and share your domain if you already have one."],
    ["We research, plan & build", "For Essential/Complete we study your work and market; for Sample we apply your edits to the shared layout."],
    ["Review together", `You see the site, we refine it with you until it feels like ${name}.`],
    ["Launch & handover", "We connect your domain, go live, and with Complete the admin portal is yours from day one."],
  ];
  steps.forEach(([t, d], i) => {
    const num = String(i + 1).padStart(2, "0");
    doc.fillColor(GOLD).font("Serif").fontSize(11).text(num, MARGIN, y);
    doc.fillColor(INK).font("Sans-Bold").fontSize(10).text(t, MARGIN + 30, y);
    doc.fillColor(GRAY).font("Sans").fontSize(9).text(d, MARGIN + 30, doc.y + 2, { width: doc.page.width - MARGIN * 2 - 30 });
    y = doc.y + 12;
  });

  footer(doc, "Forwardly · The agency that works for you · Page 3 of 4");
}

// ---------------------------------------------------------------- page 4
function techPage(doc, name) {
  background(doc);
  let y = chrome(doc, `Website Package — ${name}`);

  doc.fillColor(INK).font("Serif-Bold").fontSize(25).text("Built modern. Built to last.", MARGIN, y);
  doc.fillColor(GRAY).font("Serif-Italic").fontSize(10.5).text(
    "The technology behind your website — and exactly why it makes you more money.",
    MARGIN, doc.y + 6
  );

  y = doc.y + 26;
  const sections = [
    {
      title: "A MODERN, FAST BUILD", badge: "COMPLETE PACK",
      body: "Your website's frontend runs on React.js — the same technology behind Instagram, Netflix and Airbnb. " +
        "Instead of reloading the whole page, React swaps in only what changes, so pages feel instant on phone and desktop.",
      tags: "FRONTEND · REACT.JS   |   BACKEND · NODE.JS + EXPRESS.JS   |   DATABASE · MONGODB   |   IMAGES · CLOUDINARY",
    },
    {
      title: "FOUND ON GOOGLE", badge: null,
      body: "Node.js + Express serve clean, fast, well-structured HTML that Google can read easily — that, combined with " +
        "proper on-page SEO, is what actually moves you up in search results when someone looks for a business like yours.",
      tags: null,
    },
    {
      title: "BUILT TO LAST", badge: null,
      body: "MongoDB stores your content in a flexible way, so adding a new project, service or page later never means rebuilding the site. " +
        "Cloudinary automatically compresses and resizes every image for the visitor's exact device — sharp on a phone, sharp on a desktop, without you doing anything.",
      tags: null,
    },
  ];

  sections.forEach((s, i) => {
    const num = String(i + 1).padStart(2, "0");
    const rowY = y;
    doc.fillColor(GOLD).font("Serif").fontSize(12).text(num, MARGIN, rowY);
    doc.fillColor(INK).font("Sans-Bold").fontSize(10.5).text(s.title, MARGIN + 36, rowY, { characterSpacing: 0.3 });
    if (s.badge) {
      const w = doc.font("Sans-Bold").fontSize(7).widthOfString(s.badge, { characterSpacing: 0.5 }) + 18;
      pill(doc, s.badge, doc.page.width - MARGIN - w, rowY - 2, { filled: false });
    }
    doc.fillColor(GRAY).font("Sans").fontSize(9.5).text(s.body, MARGIN + 36, doc.y + 3, { width: doc.page.width - MARGIN * 2 - 36, lineGap: 2 });
    if (s.tags) {
      doc.fillColor(GOLD).font("Sans-Bold").fontSize(7.5).text(s.tags, MARGIN + 36, doc.y + 8, {
        width: doc.page.width - MARGIN * 2 - 36, characterSpacing: 0.2,
      });
    }
    y = doc.y + 20;
  });

  calloutBox(doc, y + 4, 132, "Why this matters for you", "");
  doc.fillColor(GRAY).font("Sans").fontSize(9.3);
  const why = [
    "Loads in under a second — visitors stay and browse, instead of leaving before it even opens.",
    "Ranks better on Google — clean code and proper structure make you easier to find and click on.",
    "Costs you nothing extra to grow — add pages, projects or products anytime without a rebuild.",
    "Looks premium everywhere — sharp and fast on every phone, tablet and desktop, automatically.",
    "Update it yourself — with the Complete pack's admin portal, no developer, no waiting, no invoice.",
  ];
  let wy = y + 42;
  why.forEach((w) => {
    doc.fillColor(GOLD).text("—  ", MARGIN + 24, wy, { continued: true });
    doc.fillColor(GRAY).text(w, { width: doc.page.width - MARGIN * 2 - 48, lineGap: 2 });
    wy = doc.y + 3;
  });

  footer(doc, "Forwardly · Built modern · Built to last · Page 4 of 4");
}

/** Build the full personalized sales proposal (cover, features, pricing, tech) for a lead. */
export function drawProposal(doc, lead) {
  registerFonts(doc);
  const name = lead.name || "Your Business";

  coverPage(doc, name);
  doc.addPage();
  featuresPage(doc, name);
  doc.addPage();
  pricingPage(doc, name);
  doc.addPage();
  techPage(doc, name);
}

/** Stream a freshly-generated proposal PDF to an Express response (no disk needed). */
export function streamProposal(lead, res) {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
  doc.addPage();
  const safe = (lead.name || "lead").replace(/[^\w-]/g, "_").slice(0, 40);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="Forwardly-Proposal-${safe}.pdf"`);
  doc.pipe(res);
  drawProposal(doc, lead);
  doc.end();
}
