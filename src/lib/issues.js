/**
 * Read issue archive + optional events feed from the site-repo files
 * copied by prepare-market. Never invent events.
 *
 * Dated issue HTML and latest.html land in src/generated/issues/ (not
 * public/) so Astro can wrap them in the site layout instead of
 * passing the email document through verbatim.
 *
 * Events live in the platform at markets/<id>/state/curated.json, which a
 * Cloudflare build cannot see. A site-repo `events.json` is the export this
 * homepage would need. Until that file exists, B/C drive the calendar from
 * this week's issue (titles already published) and from issue dates.
 */
import fs from "node:fs";
import path from "node:path";
import { parseIsoDate } from "./calendar.js";
import { extractIssueDocument } from "./issue-html.js";

const MONTH_INDEX = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function publicPath(...parts) {
  return path.resolve("public", ...parts);
}

export function generatedIssuesDir() {
  return path.resolve("src", "generated", "issues");
}

function issuesSourceDir() {
  const generated = generatedIssuesDir();
  if (fs.existsSync(generated)) return generated;
  return publicPath("issues");
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

function stripTags(html) {
  return decodeEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function loadIssueManifest() {
  const file = publicPath("issues", "manifest.json");
  if (!fs.existsSync(file)) return [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const date = parseIsoDate(item.date)?.iso;
      if (!date || !item.file) return null;
      return {
        date,
        file: item.file,
        title: String(item.title || item.subject || date).trim(),
        subject: String(item.subject || item.title || "").trim(),
        href: `/issues/${item.file}`,
        kind: "issue",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Optional feed. Shape:
 *   [{ "title", "date", "venue"?, "time"?, "url"? }]
 * Copied from the site repo when present. Not created here.
 */
export function loadEventsFeed() {
  const file = publicPath("events.json");
  if (!fs.existsSync(file)) {
    return { present: false, events: [] };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { present: false, events: [] };
  }
  const rows = Array.isArray(data) ? data : data.events;
  if (!Array.isArray(rows)) return { present: false, events: [] };
  const events = rows
    .map((item) => {
      const date = parseIsoDate(item.date || item.event_date)?.iso;
      const title = String(item.title || "").trim();
      if (!date || !title) return null;
      return {
        title,
        date,
        venue: item.venue ? String(item.venue).trim() : "",
        time: item.time ? String(item.time).trim() : "",
        href: item.url || item.href || "/issues/latest.html",
        kind: "event",
        source: "events.json",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { present: true, events };
}

function parseWeekdayHeading(heading, year) {
  const match = heading.match(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+)\s+(\d{1,2})(?:\s*,\s*(\d{4}))?/i
  );
  if (!match) return null;
  const month = MONTH_INDEX[match[2].toLowerCase()];
  const day = Number(match[3]);
  const y = Number(match[4] || year);
  if (!month || !day) return null;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function firstParagraphAfter(html, index) {
  const slice = html.slice(index);
  const p = slice.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (!p) return "";
  return stripTags(p[1]);
}

/**
 * Pull titled items from the latest issue HTML that already ships in the
 * site repo. h3 headings and list-item links only — not every inline link.
 */
export function listIssueHtmlFiles() {
  const dir = issuesSourceDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(
      (name) =>
        name.endsWith(".html") &&
        name !== "index.html" &&
        !name.startsWith(".")
    )
    .sort();
}

export function loadIssuePage(filename) {
  const dir = issuesSourceDir();
  const file = path.join(dir, filename);
  if (!fs.existsSync(file)) return null;
  let html = "";
  try {
    html = fs.readFileSync(file, "utf8");
  } catch {
    return extractIssueDocument("", { filename });
  }
  const extracted = extractIssueDocument(html, { filename });
  const fromManifest = loadIssueManifest().find((item) => item.file === filename);
  return {
    filename,
    href: `/issues/${filename}`,
    date: fromManifest?.date || filename.replace(/\.html$/i, ""),
    ...extracted,
    title: extracted.title || fromManifest?.subject || fromManifest?.title || filename,
    description: extracted.description || fromManifest?.subject || "",
  };
}

export function parseLatestIssuePicks(issueDate) {
  const file = path.join(issuesSourceDir(), "latest.html");
  if (!fs.existsSync(file)) return [];
  const html = fs.readFileSync(file, "utf8");
  const year = parseIsoDate(issueDate)?.year || Number(String(issueDate).slice(0, 4));
  const fallbackDate = parseIsoDate(issueDate)?.iso || issueDate;
  const parts = html.split(/<h2\b[^>]*>/i);
  const picks = [];
  const seen = new Set();

  function push(item) {
    const title = item.title.replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) return;
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    picks.push({ ...item, title });
  }

  for (const part of parts.slice(1)) {
    const close = part.match(/^([\s\S]*?)<\/h2>/i);
    if (!close) continue;
    const heading = stripTags(close[1]);
    const dated = parseWeekdayHeading(heading, year);
    const date = dated || fallbackDate;
    const dateLabel = dated ? heading : heading || displayFallback(date);
    const body = part.slice(close[0].length);

    for (const m of body.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)) {
      const inner = m[1];
      const link = inner.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const title = stripTags(link ? link[2] : inner);
      const href = link ? link[1] : "/issues/latest.html";
      const dek = firstParagraphAfter(body, m.index + m[0].length);
      push({
        title,
        href,
        date,
        dateLabel,
        dek: dek && dek.length < 220 ? dek : "",
        venue: "",
        time: "",
        kind: "issue-pick",
        source: "issue",
      });
    }

    for (const m of body.matchAll(
      /<li\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    )) {
      push({
        title: stripTags(m[2]),
        href: m[1],
        date,
        dateLabel,
        dek: "",
        venue: "",
        time: "",
        kind: "issue-pick",
        source: "issue",
      });
    }
  }

  return picks;
}

function displayFallback(iso) {
  return iso || "";
}

export function listingsForCalendar({ eventsFeed, issuePicks, issues }) {
  if (eventsFeed?.present && eventsFeed.events.length) {
    return {
      kind: "events",
      heading: "On the calendar",
      items: eventsFeed.events,
    };
  }
  if (issuePicks?.length) {
    return {
      kind: "issue-picks",
      heading: "In this week's issue",
      items: issuePicks,
    };
  }
  return {
    kind: "issues",
    heading: "Past issues",
    items: (issues || []).map((issue) => ({
      title: issue.title,
      href: issue.href,
      date: issue.date,
      dateLabel: issue.date,
      dek: issue.subject && issue.subject !== issue.title ? issue.subject : "",
      venue: "",
      time: "",
      kind: "issue",
      source: "manifest",
    })),
  };
}
