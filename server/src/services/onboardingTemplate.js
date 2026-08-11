// Default profile fields + section set for a new onboarding. Generic on
// purpose — covers what almost every demo site has; admin can add/remove/
// edit per client after creation, since not every demo has e.g. a shop
// section, and imageCount varies per client's actual demo.

// Personal & professional details — the wizard's first page. `prefill` is
// resolved against the Lead record when the onboarding is created (see
// onboarding.routes.js), so this stays a template of *fields*, not values.
export function buildDefaultProfileFields(lead = {}) {
  return [
    { key: "business_name", label: "Business name", type: "text", required: true, adminPrefill: lead.name || null },
    { key: "owner_name", label: "Your name", type: "text", required: true, adminPrefill: null },
    { key: "phone", label: "Phone number", type: "tel", required: true, adminPrefill: lead.phone || null },
    { key: "email", label: "Email address", type: "email", required: true, adminPrefill: lead.email || null },
    { key: "address", label: "Business address", type: "textarea", required: false, adminPrefill: lead.city || null },
  ];
}

function section(key, title, description, imageCount = 0) {
  return {
    key,
    title,
    description,
    imageCount,
    keepAsIs: { adminPrefill: null, clientAnswer: null },
    changeImages: { adminPrefill: null, clientAnswer: null },
    imagesToChange: [],
    imageUploads: [],
    contentChanges: { adminPrefill: null, clientAnswer: null },
  };
}

export function buildDefaultSections() {
  return [
    section("hero", "Hero", "The very first thing visitors see — headline, main image/video, and call to action.", 1),
    section("about", "About", "Your story, what makes your business different.", 2),
    section("services", "Services", "What you offer, listed out for visitors.", 0),
    section("portfolio", "Portfolio / Work", "Examples of your past work.", 6),
    section("contact", "Contact", "How clients reach you — phone, address, socials, contact form.", 0),
  ];
}

// Studio Decor's actual demo (Florence-main repo) has 6 real homepage
// sections in this exact order: Hero, About, Expanding Works, Services,
// Shop, Contact. Image counts verified directly against the demo's source
// (src/data/projects.js `featured` list, and the hardcoded image arrays in
// each Home* component) — not guessed from labels.
export function buildStudioDecorSections() {
  return [
    // Hero's autoplay slider cycles through all 8 `featured` projects.
    section("hero", "Hero", "Your homepage's opening section — rotating slider through your featured projects.", 8),
    // HomeAbout.jsx hardcodes exactly one image (sofa-framed-art.jpg).
    section("about", "About (Studio Decor story)", "Who you are, your studio's story and specialities.", 1),
    // Same 8 `featured` projects as the hero, shown as expanding panels.
    section("expanding_works", "Expanding Works (interactive project showcase)", "The interactive panel that expands to show different project categories.", 8),
    // HomeServices.jsx has 3 service cards, each with its own image.
    section("services", "Services", "Your specialities — curtains, wallpaper, flooring, blinds, etc.", 3),
    // HomeShop.jsx shows 4 picks (curtain, wallpaper, wooden flooring, sofa fabric).
    section("shop", "Shop", "Product/material showcase section.", 4),
    section("contact", "Contact", "Address, phone, WhatsApp, map, socials.", 0),
  ];
}
