/**
 * Classify a lead:
 *   hot    = NO website  → assignable (biggest opportunity: sell them a site)
 *   medium = has a website but weak online presence (redesign / marketing angle)
 *   cold   = has a website + strong presence
 */
export function classify(lead) {
  const hasWebsite = Boolean(lead.website && lead.website.trim());
  if (!hasWebsite) return { classification: "hot", hasWebsite: false };

  const weak = (lead.reviews || 0) < 20 || (lead.rating || 0) < 4.0;
  return { classification: weak ? "medium" : "cold", hasWebsite: true };
}
