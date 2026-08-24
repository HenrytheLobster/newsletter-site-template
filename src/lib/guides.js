import fs from "node:fs";
import path from "node:path";
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
  return guideListings(body).reduce((venues, listing) => {
    if (!listing.venue || venues.includes(listing.venue)) return venues;
    venues.push(listing.venue);
    return venues;
  }, []);
}

function isListingBlock(block) {
  return (
    /\[Details and registration\]\([^)]+\)/.test(block) ||
    /<!--\s*dates observed:/i.test(block)
  );
}

export function guideListings(body) {
  if (!body) return [];

  const lines = body.split("\n");
  const listings = [];
  let currentVenue = "";
  let pending = null;

  function flushPending() {
    if (!pending) return;
    if (isListingBlock(pending.block.join("\n"))) {
      listings.push({
        name: pending.name,
        venue: pending.venue,
      });
    }
    pending = null;
  }

  for (const line of lines) {
    if (/^---\s*$/.test(line)) {
      flushPending();
      currentVenue = "";
      continue;
    }

    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      flushPending();
      currentVenue = h2[1].trim();
      continue;
    }

    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      flushPending();
      pending = {
        name: h3[1].trim(),
        venue: currentVenue,
        block: [],
      };
      continue;
    }

    if (pending) pending.block.push(line);
  }

  flushPending();
  return listings;
}

function positiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readPngDimensions(buffer) {
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer.toString("ascii", 1, 4) !== "PNG"
  ) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }

  if (
    chunk === "VP8 " &&
    buffer.length >= 30 &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

export function publicImageDimensions(src, explicitWidth, explicitHeight) {
  const width = positiveInt(explicitWidth);
  const height = positiveInt(explicitHeight);
  if (width && height) return { width, height };
  if (!src || src.startsWith("http")) return null;

  const relative = src.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(process.cwd(), "public", relative));
  const publicRoot = path.normalize(path.join(process.cwd(), "public"));
  if (!filePath.startsWith(publicRoot + path.sep)) return null;

  try {
    const buffer = fs.readFileSync(filePath);
    return (
      readPngDimensions(buffer) ||
      readJpegDimensions(buffer) ||
      readWebpDimensions(buffer)
    );
  } catch {
    return null;
  }
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
