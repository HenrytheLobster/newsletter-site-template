import { guidePath } from "./market.js";

const PLACE_LABELS = {
  "washington-dc": "Washington, DC",
  arlington: "Arlington",
  "fairfax-county": "Fairfax County",
  "loudoun-county": "Loudoun County",
  williamsburg: "Williamsburg",
  "newport-news": "Newport News",
  "salt-lake-county": "Salt Lake County",
  "davis-county": "Davis County",
  "utah-county": "Utah County",
  "weber-county": "Weber County",
  "summit-county": "Summit County",
};

export function placeLabel(place) {
  if (!place) return "";
  if (PLACE_LABELS[place]) return PLACE_LABELS[place];
  return place
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Topic family is the slug with the trailing `-{place}` stripped.
 * `best-story-times-arlington` + place `arlington` → `best-story-times`.
 */
export function topicFamily(slug, place) {
  if (!slug) return "";
  if (place && slug.endsWith(`-${place}`)) {
    return slug.slice(0, -(place.length + 1));
  }
  return slug;
}

export function formatDate(value) {
  if (value == null || value === "" || value === "null") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  return text || null;
}

/**
 * Related guides, computed at build time.
 * Fill from same place, then same archetype, then same topic family.
 */
export function relatedGuides(current, all, limit = 4) {
  const currentSlug = current.data.slug;
  const others = all.filter((g) => g.data.slug !== currentSlug);
  const seen = new Set();
  const out = [];

  const family = topicFamily(current.data.slug, current.data.place);
  const sameFamily = (g) => topicFamily(g.data.slug, g.data.place) === family;
  const samePlace = (g) => g.data.place && g.data.place === current.data.place;
  const sameArchetype = (g) =>
    Boolean(current.data.archetype) &&
    g.data.archetype &&
    g.data.archetype === current.data.archetype;

  // Ranked: local sister pages, then the topic family (other counties),
  // then other local guides, then the rest of the archetype.
  const buckets = [
    others.filter((g) => samePlace(g) && sameFamily(g)),
    others.filter((g) => sameFamily(g)),
    others.filter((g) => samePlace(g)),
    others.filter((g) => sameArchetype(g)),
  ];

  for (const bucket of buckets) {
    for (const g of bucket) {
      if (seen.has(g.data.slug)) continue;
      seen.add(g.data.slug);
      out.push(g);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function venueHeadings(body) {
  if (!body) return [];
  return [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

export function toCard(market, entry) {
  return {
    href: guidePath(market, entry.data.slug),
    title: entry.data.title,
    description: entry.data.description,
    place: placeLabel(entry.data.place),
    entryCount: entry.data.entry_count,
    generated: formatDate(entry.data.generated),
  };
}
