// Default section/question set for a new onboarding. Generic on purpose —
// covers the sections almost every demo site has (hero, about, services,
// portfolio, contact); admin can add/remove/edit sections per client after
// creation, since not every demo has e.g. a shop section.

function standardQuestions(sectionLabel, imageCount) {
  const questions = [
    {
      key: "keep_as_is",
      label: `Can we carry the ${sectionLabel} over from your demo, personalized to your business, as-is?`,
      type: "yesnomaybe",
      helpText: "\"Maybe\" if you want changes but aren't sure exactly what yet — we'll follow up on specifics.",
    },
  ];
  if (imageCount) {
    questions.push({
      key: "images_ok",
      label: `The demo uses ${imageCount} image${imageCount === 1 ? "" : "s"} here — do all ${imageCount} work for your business, or do some need replacing?`,
      type: "yesnomaybe",
      helpText: "Choose \"Maybe\" and use the upload below if only some of the images need to change.",
    });
    questions.push({
      key: "replacement_images",
      label: "Upload any replacement images for this section",
      type: "multiupload",
      helpText: "Only needed if you answered anything other than \"Yes\" above.",
    });
  }
  questions.push({
    key: "content_changes",
    label: "Any text/content changes needed in this section? (business name, description, taglines, etc.)",
    type: "text",
  });
  return questions;
}

export function buildDefaultSections() {
  return [
    {
      key: "hero",
      title: "Hero",
      description: "The very first thing visitors see — headline, main image/video, and call to action.",
      questions: standardQuestions("hero section", 1),
    },
    {
      key: "about",
      title: "About",
      description: "Your story, what makes your business different.",
      questions: standardQuestions("about section", 2),
    },
    {
      key: "services",
      title: "Services",
      description: "What you offer, listed out for visitors.",
      questions: standardQuestions("services section", 0),
    },
    {
      key: "portfolio",
      title: "Portfolio / Work",
      description: "Examples of your past work.",
      questions: standardQuestions("portfolio section", 6),
    },
    {
      key: "contact",
      title: "Contact",
      description: "How clients reach you — phone, address, socials, contact form.",
      questions: standardQuestions("contact section", 0),
    },
  ];
}

// Studio Decor's actual demo (Florence-main repo) has 6 real homepage
// sections in this exact order: Hero, About, Expanding Works, Services,
// Shop, Contact. Used to seed their real onboarding instance.
export function buildStudioDecorSections() {
  return [
    {
      key: "hero",
      title: "Hero",
      description: "Your homepage's opening section — main image and headline.",
      questions: standardQuestions("hero section", 1),
    },
    {
      key: "about",
      title: "About (Studio Decor story)",
      description: "Who you are, your studio's story and specialities.",
      questions: standardQuestions("about section", 2),
    },
    {
      key: "expanding_works",
      title: "Expanding Works (interactive project showcase)",
      description: "The interactive panel that expands to show different project categories.",
      questions: standardQuestions("Expanding Works section", 4),
    },
    {
      key: "services",
      title: "Services",
      description: "Your specialities — curtains, wallpaper, flooring, blinds, etc.",
      questions: standardQuestions("services section", 0),
    },
    {
      key: "shop",
      title: "Shop",
      description: "Product/material showcase section.",
      questions: standardQuestions("shop section", 6),
    },
    {
      key: "contact",
      title: "Contact",
      description: "Address, phone, WhatsApp, map, socials.",
      questions: standardQuestions("contact section", 0),
    },
  ];
}
