#!/usr/bin/env node
/**
 * Copy one market's markdown + pass-through static files into the Astro app.
 *
 * Template mode (this repo): reads the platform content dir and the live
 * site repo (never writes them). Site mode (a market repo): markdown is
 * already at src/content/guides/; pass-through files come from this
 * checkout. Cloudflare cannot see the platform or the other site repos.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MARKETS, MARKET_IDS, getMarket as catalogGetMarket } from "../src/config/markets.js";
import { getDesignId } from "../src/config/designs.js";
import { guidePath } from "../src/lib/market.js";
import { generatedMarketPath } from "../src/lib/project.js";
import { relatedGuides, venueHeadings } from "../src/lib/guides.js";
import {
  ROOT,
  astroGeneratedHtml,
  emptyDir,
  emptyDirKeeping,
  ensureDir,
  fileToUrl,
  findCfFile,
  generatedDir,
  generatedGuidesDir,
  guidesContentDir,
  markdownSlugs,
  publicDir,
  walkFiles,
} from "./paths.mjs";

const TEXT_EXT = new Set([".html", ".js", ".css", ".xml", ".txt", ".json", ".svg", ".md"]);
const PUBLIC_KEEP = new Set(["_redirects", ".assetsignore"]);
const CF_FILES = ["_redirects", ".assetsignore"];
const VENUE_LINK_PREFIX = "_Also in:";

function rewriteForeignIdentifiers(text, market) {
  let out = text;
  for (const id of MARKET_IDS) {
    if (id === market.id) continue;
    const other = MARKETS[id];
    if (other.analyticsId) {
      out = out.split(other.analyticsId).join(market.analyticsId);
    }
    if (other.kit?.uid && other.kit.uid !== market.kit.uid) {
      out = out.split(other.kit.uid).join(market.kit.uid);
    }
    if (other.kit?.account) {
      out = out
        .split(`${other.kit.account}.kit.com`)
        .join(`${market.kit.account}.kit.com`);
    }
    if (other.domain) {
      out = out.split(other.domain).join(market.domain);
    }
    if (other.name) {
      out = out.split(other.name).join(market.name);
    }
  }
  return out;
}

function copyFile(src, dest, { rewrite } = {}) {
  ensureDir(path.dirname(dest));
  if (rewrite && TEXT_EXT.has(path.extname(src).toLowerCase())) {
    const original = fs.readFileSync(src, "utf8");
    const next = rewriteForeignIdentifiers(original, rewrite);
    fs.writeFileSync(dest, next);
    return;
  }
  fs.copyFileSync(src, dest);
}

function parseGuideMarkdown(file) {
  const markdown = fs.readFileSync(file, "utf8");
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = {};
  let body = markdown;
  let header = "";
  if (match) {
    header = match[0];
    body = markdown.slice(match[0].length);
    for (const line of match[1].split("\n")) {
      const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!field) continue;
      const [, key, rawValue] = field;
      frontmatter[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
  return { header, body, data: frontmatter };
}

function normalizeVenueHeading(value) {
  return String(value || "")
    .trim()
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function escapeMarkdownLinkText(value) {
  return String(value || "").replace(/([\\[\]])/g, "\\$1");
}

function escapeMarkdownLinkHref(value) {
  return String(value || "").replace(/\)/g, "%29");
}

function rankVenueGuideLinks(current, candidates) {
  const ranked = relatedGuides(current, [current, ...candidates], candidates.length);
  const seen = new Set(ranked.map((guide) => guide.data.slug));
  for (const guide of candidates) {
    if (!seen.has(guide.data.slug)) ranked.push(guide);
  }
  const samePlace = [];
  const fallback = [];
  for (const guide of ranked) {
    if (guide.data.place && guide.data.place === current.data.place) {
      samePlace.push(guide);
    } else {
      fallback.push(guide);
    }
  }
  return [...samePlace, ...fallback].slice(0, 2);
}

function insertVenueGuideLinks(body, guide, venueIndex, market) {
  const lines = body.split("\n");
  const out = [];
  for (const line of lines) {
    out.push(line);
    const match = line.match(/^## (.+)$/);
    if (!match) continue;
    const normalized = normalizeVenueHeading(match[1]);
    const candidates = (venueIndex.get(normalized) || []).filter(
      (other) => other.data.slug !== guide.data.slug
    );
    if (candidates.length === 0) continue;
    const links = rankVenueGuideLinks(guide, candidates).map((entry) => {
      const title = escapeMarkdownLinkText(entry.data.title || entry.data.slug);
      const href = escapeMarkdownLinkHref(guidePath(market, entry.data.slug));
      return `[${title}](${href})`;
    });
    if (links.length > 0) {
      out.push("");
      out.push(`${VENUE_LINK_PREFIX} ${links.join(", ")}._`);
    }
  }
  return out.join("\n");
}

function addInternalVenueLinks(contentDest, market) {
  const files = fs
    .readdirSync(contentDest)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(contentDest, name))
    .sort();
  const guides = files.map((file) => {
    const parsed = parseGuideMarkdown(file);
    return {
      file,
      header: parsed.header,
      body: parsed.body,
      data: {
        ...parsed.data,
        slug: parsed.data.slug || path.basename(file, ".md"),
      },
    };
  });
  const venueIndex = new Map();
  for (const guide of guides) {
    for (const heading of venueHeadings(guide.body)) {
      const normalized = normalizeVenueHeading(heading);
      if (!normalized) continue;
      if (!venueIndex.has(normalized)) venueIndex.set(normalized, []);
      venueIndex.get(normalized).push(guide);
    }
  }
  for (const guide of guides) {
    const body = insertVenueGuideLinks(guide.body, guide, venueIndex, market);
    fs.writeFileSync(guide.file, guide.header + body);
  }
}

async function loadMarketModule(file) {
  const mod = await import(pathToFileURL(file).href);
  return mod.market || mod.default;
}

async function resolveMarket() {
  const siteFile = path.join(ROOT, "src", "config", "market.js");
  if (fs.existsSync(siteFile)) {
    const market = await loadMarketModule(siteFile);
    if (!market?.id) {
      throw new Error(`${siteFile} must export { market } with an id`);
    }
    if (!process.env.MARKET) process.env.MARKET = market.id;
    if (!process.env.DESIGN) process.env.DESIGN = "c";
    return { market, mode: "site" };
  }

  const catalog = catalogGetMarket();
  const overlay = path.join(catalog.siteRepo, "src", "config", "market.js");
  if (fs.existsSync(overlay)) {
    const siteMarket = await loadMarketModule(overlay);
    return {
      market: {
        ...siteMarket,
        siteRepo: catalog.siteRepo,
        contentDir: catalog.contentDir,
      },
      mode: "template",
    };
  }
  return { market: catalog, mode: "template" };
}

function copyCfInputs(market, pub) {
  for (const name of CF_FILES) {
    const dest = path.join(pub, name);
    if (fs.existsSync(dest)) continue;
    const src = findCfFile(name, market);
    if (!src || src === dest) continue;
    copyFile(src, dest);
  }
}

async function main() {
  const { market, mode } = await resolveMarket();
  const design = getDesignId();
  const contentSource = mode === "template" ? market.contentDir : guidesContentDir();
  const contentDest = generatedGuidesDir();
  const pub = publicDir();
  const gen = generatedDir();

  ensureDir(gen);
  fs.writeFileSync(
    generatedMarketPath(),
    JSON.stringify(market, null, 2) + "\n"
  );

  if (!fs.existsSync(contentSource)) {
    throw new Error(`Content dir missing: ${contentSource}`);
  }
  emptyDir(contentDest);
  for (const name of fs.readdirSync(contentSource)) {
    if (!name.endsWith(".md")) continue;
    fs.copyFileSync(
      path.join(contentSource, name),
      path.join(contentDest, name)
    );
  }
  addInternalVenueLinks(contentDest, market);

  if (mode === "template") {
    if (!fs.existsSync(market.siteRepo)) {
      throw new Error(`Site repo missing: ${market.siteRepo}`);
    }
    emptyDir(pub);
  } else {
    emptyDirKeeping(pub, PUBLIC_KEEP);
  }

  emptyDir(path.join(gen, "issues"));

  const slugs = markdownSlugs(market);
  if (mode === "site" && slugs.length === 0) {
    throw new Error(
      `No guide markdown in ${contentSource}. Backfill from newsletter-platform/markets/${market.id}/content/*.md`
    );
  }

  const generatedSkip = astroGeneratedHtml(market);
  const walkRoot = mode === "site" ? ROOT : market.siteRepo;
  const copied = [];
  for (const rel of walkFiles(walkRoot, {
    shouldSkip: (relPosix) => generatedSkip.has(relPosix),
  })) {
    const src = path.join(walkRoot, rel);
    const dest = path.join(pub, rel);
    const underIssues = rel === "issues" || rel.startsWith("issues/");
    // Issue HTML is wrapped by Astro, so it must not land in public/
    // as a pass-through document. Archive index is rendered from the
    // manifest. Dated files + latest.html go to src/generated/issues/.
    if (underIssues && rel.endsWith(".html")) {
      if (rel === "issues/index.html") {
        copied.push(rel);
        continue;
      }
      copyFile(src, path.join(gen, rel), { rewrite: null });
      copied.push(rel);
      continue;
    }
    copyFile(src, dest, { rewrite: underIssues ? null : market });
    copied.push(rel);
  }

  copyCfInputs(market, pub);

  const passthroughHtml = copied
    .filter((rel) => rel.endsWith(".html"))
    .filter((rel) => !rel.startsWith("issues/"))
    .map(fileToUrl)
    .sort();

  const eventsJson = path.join(walkRoot, "events.json");
  const hasEventsFeed = fs.existsSync(eventsJson);

  const state = {
    marketId: market.id,
    design,
    name: market.name,
    domain: market.domain,
    guidesBasePath: market.guidesBasePath,
    markdownSlugs: slugs,
    copiedFiles: copied,
    passthroughHtml,
    eventsFeed: hasEventsFeed,
    mode,
  };
  fs.writeFileSync(
    path.join(gen, "state.json"),
    JSON.stringify(state, null, 2) + "\n"
  );

  console.log(
    `[prepare] ${market.id} design=${design} mode=${mode}: ${slugs.length} markdown guides, ${copied.length} pass-through files`
  );
  if (hasEventsFeed) {
    console.log(`[prepare] ${market.id}: events.json present (calendar will use it)`);
  } else {
    console.log(
      `[prepare] ${market.id}: no events.json in site repo — calendar uses this week's issue / issue dates. A curated-events export is a prerequisite for a live event calendar.`
    );
  }
}

main();
