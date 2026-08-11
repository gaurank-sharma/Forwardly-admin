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
// Shop, Contact. Used to seed their real onboarding instance.
export function buildStudioDecorSections() {
  return [
    section("hero", "Hero", "Your homepage's opening section — main image and headline.", 1),
    section("about", "About (Studio Decor story)", "Who you are, your studio's story and specialities.", 2),
    section("expanding_works", "Expanding Works (interactive project showcase)", "The interactive panel that expands to show different project categories.", 4),
    section("services", "Services", "Your specialities — curtains, wallpaper, flooring, blinds, etc.", 0),
    section("shop", "Shop", "Product/material showcase section.", 6),
    section("contact", "Contact", "Address, phone, WhatsApp, map, socials.", 0),
  ];
}
