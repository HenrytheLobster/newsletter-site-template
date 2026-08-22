import fs from "node:fs";
import path from "node:path";
import { guidePath, guidesIndexPath } from "./market.js";
import { placeLabel, topicFamily, toCard, formatDate } from "./guides.js";
import {
  loadIssueManifest,
  loadEventsFeed,
  parseLatestIssuePicks,
  listingsForCalendar,
} from "./issues.js";
import { buildMonthGrid, marksFromItems, parseIsoDate } from "./calendar.js";

const FAMILY_LABELS = {
  "best-story-times": "Story times",
  "best-kids-stem": "Kids STEM",
  "best-english-help": "English help",
  "best-tech-help": "Tech help",
  "best-job-help": "Job help",
  "best-book-clubs": "Book clubs",
  "best-trivia-nights": "Trivia nights",
  "best-board-games": "Board games",
  "best-senior-fitness": "Senior fitness",
  "best-live-music": "Live music",
  "things-to-do-near": "Things to do",
  "best-free-museums": "Museums",
};

function publicAbs(urlPath) {
  const rel = String(urlPath || "").replace(/^\//, "");
  return path.resolve("public", rel);
}

export function publicExists(urlPath) {
  if (!urlPath) return false;
  return fs.existsSync(publicAbs(urlPath));
}

const HERO_NAMES = ["hero.jpg", "hero.jpeg", "hero.png", "hero.webp"];

export function discoverImage(urlPaths) {
  for (const candidate of urlPaths) {
    if (candidate && publicExists(candidate)) return candidate;
  }
  return null;
}

export function guideHeroImage(market, slug, frontmatterImage) {
  if (frontmatterImage) {
    const fromFm = `${guidePath(market, slug)}/${frontmatterImage}`.replace(/\/+/g, "/");
    if (publicExists(fromFm)) return fromFm;
  }
  const base = `/${market.guidesBasePath}/${slug}/images`;
  const candidates = [
    ...HERO_NAMES.map((name) => `${base}/${name}`),
    `/images/guides/${slug}/hero.webp`,
    `/images/guides/${slug}/hero.jpg`,
    `/images/guides/${slug}/hidden-door.webp`,
  ];
  return discoverImage(candidates);
}

function familyLabel(family) {
  if (FAMILY_LABELS[family]) return FAMILY_LABELS[family];
  return family
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function withImage(item) {
  if (item?.image && publicExists(item.image)) return item.image;
  return null;
}

export function buildHomeModel(market, guides) {
  const issues = loadIssueManifest();
  const latestIssue = issues[0] || null;
  const eventsFeed = loadEventsFeed();
  const issuePicks = latestIssue
    ? parseLatestIssuePicks(latestIssue.date)
    : [];
  const listings = listingsForCalendar({ eventsFeed, issuePicks, issues });

  const guideCards = guides
    .map((entry) => {
      const card = toCard(market, entry);
      const image = guideHeroImage(market, entry.data.slug, entry.data.hero_image);
      const family = topicFamily(entry.data.slug, entry.data.place);
      return {
        ...card,
        image,
        family,
        familyLabel: familyLabel(family),
        generated: formatDate(entry.data.generated),
        kicker: placeLabel(entry.data.place) || market.regionLabel,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const leadMagnets = (market.leadMagnets || []).map((item) => ({
    ...item,
    image: withImage(item),
    kicker: "Guide",
  }));

  const featuredLegacy = (market.featuredLegacy || []).map((item) => ({
    ...item,
    image: withImage(item),
    kicker: "Guide",
  }));

  const promoMagnet =
    leadMagnets.find((m) => m.kit && m.kit.uid && m.kit.uid !== market.kit.uid) ||
    leadMagnets[0] ||
    featuredLegacy[0] ||
    null;

  const featuredGuide =
    leadMagnets.find((m) => m.image && m.href !== promoMagnet?.href) ||
    leadMagnets.find((m) => m.image) ||
    guideCards.find((c) => c.image) ||
    featuredLegacy.find((m) => m.image) ||
    featuredLegacy[0] ||
    null;

  const groupsMap = new Map();
  for (const card of guideCards) {
    const key = card.family || "guides";
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        family: key,
        label: card.familyLabel,
        cards: [],
      });
    }
    groupsMap.get(key).cards.push(card);
  }
  const groupedGuides = [...groupsMap.values()].sort(
    (a, b) => b.cards.length - a.cards.length || a.label.localeCompare(b.label)
  );

  const imaged = [
    ...leadMagnets.filter((m) => m.image),
    ...featuredLegacy.filter(
      (m) => m.image && !leadMagnets.some((g) => g.href === m.href)
    ),
    ...guideCards.filter((c) => c.image),
  ];
  const seenImg = new Set();
  const imageGrid = [];
  for (const item of imaged) {
    if (!item.image || seenImg.has(item.href) || seenImg.has(item.image)) continue;
    seenImg.add(item.href);
    seenImg.add(item.image);
    imageGrid.push(item);
  }

  const issueDate = latestIssue?.date;
  const parsed = parseIsoDate(issueDate);
  const now = parsed || { year: 2026, month: 8 };
  const marks = {
    ...marksFromItems(issues, { kind: "issue" }),
    ...marksFromItems(listings.items, { href: "/issues/latest.html", kind: listings.kind }),
  };
  const calendar = buildMonthGrid(now.year, now.month, marks);

  return {
    issues,
    latestIssue,
    eventsFeed,
    issuePicks,
    listings,
    calendar,
    leadMagnets,
    featuredLegacy,
    promoMagnet,
    featuredGuide,
    guideCards,
    groupedGuides,
    imageGrid,
    guidesIndex: guidesIndexPath(market),
    eventsFeedMissing: !eventsFeed.present,
  };
}
