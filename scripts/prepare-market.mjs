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
import { generatedMarketPath } from "../src/lib/project.js";
import {
  ROOT,
  astroGeneratedHtml,
  emptyDir,
  emptyDirKeeping,
  ensureDir,
  fileToUrl,
  findCfFile,
  generatedDir,
  guidesContentDir,
  markdownSlugs,
  publicDir,
  walkFiles,
} from "./paths.mjs";

const TEXT_EXT = new Set([".html", ".js", ".css", ".xml", ".txt", ".json", ".svg", ".md"]);
const PUBLIC_KEEP = new Set(["_redirects", ".assetsignore"]);
const CF_FILES = ["_redirects", ".assetsignore"];

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
  const contentDest = guidesContentDir();
  const pub = publicDir();
  const gen = generatedDir();

  ensureDir(gen);
  fs.writeFileSync(
    generatedMarketPath(),
    JSON.stringify(market, null, 2) + "\n"
  );

  if (mode === "template") {
    if (!fs.existsSync(market.contentDir)) {
      throw new Error(`Content dir missing: ${market.contentDir}`);
    }
    if (!fs.existsSync(market.siteRepo)) {
      throw new Error(`Site repo missing: ${market.siteRepo}`);
    }
    emptyDir(contentDest);
    emptyDir(pub);
    for (const name of fs.readdirSync(market.contentDir)) {
      if (!name.endsWith(".md")) continue;
      fs.copyFileSync(
        path.join(market.contentDir, name),
        path.join(contentDest, name)
      );
    }
  } else {
    emptyDirKeeping(pub, PUBLIC_KEEP);
  }

  emptyDir(path.join(gen, "issues"));

  const slugs = markdownSlugs(market);
  if (mode === "site" && slugs.length === 0) {
    throw new Error(
      `No guide markdown in ${contentDest}. Backfill from newsletter-platform/markets/${market.id}/content/*.md`
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
