#!/usr/bin/env node
/**
 * Copy one market's markdown + pass-through static files into the Astro app.
 * Reads (never writes) the platform content dir and the live site repo.
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket, MARKETS, MARKET_IDS } from "../src/config/markets.js";
import { getDesignId } from "../src/config/designs.js";
import {
  ROOT,
  astroGeneratedHtml,
  emptyDir,
  ensureDir,
  fileToUrl,
  generatedDir,
  guidesContentDir,
  markdownSlugs,
  publicDir,
  walkFiles,
} from "./paths.mjs";

const TEXT_EXT = new Set([".html", ".js", ".css", ".xml", ".txt", ".json", ".svg", ".md"]);

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

function main() {
  const market = getMarket();
  const slugs = markdownSlugs(market);
  const generatedSkip = astroGeneratedHtml(market);
  const contentDest = guidesContentDir();
  const pub = publicDir();

  emptyDir(contentDest);
  emptyDir(pub);
  ensureDir(generatedDir());

  if (!fs.existsSync(market.contentDir)) {
    throw new Error(`Content dir missing: ${market.contentDir}`);
  }
  if (!fs.existsSync(market.siteRepo)) {
    throw new Error(`Site repo missing: ${market.siteRepo}`);
  }

  for (const name of fs.readdirSync(market.contentDir)) {
    if (!name.endsWith(".md")) continue;
    fs.copyFileSync(
      path.join(market.contentDir, name),
      path.join(contentDest, name)
    );
  }

  const copied = [];
  for (const rel of walkFiles(market.siteRepo, {
    shouldSkip: (relPosix) => generatedSkip.has(relPosix),
  })) {
    const src = path.join(market.siteRepo, rel);
    const dest = path.join(pub, rel);
    const underIssues = rel === "issues" || rel.startsWith("issues/");
    copyFile(src, dest, { rewrite: underIssues ? null : market });
    copied.push(rel);
  }

  const passthroughHtml = copied
    .filter((rel) => rel.endsWith(".html"))
    .map(fileToUrl)
    .sort();

  const eventsJson = path.join(market.siteRepo, "events.json");
  const hasEventsFeed = fs.existsSync(eventsJson);
  const design = getDesignId();

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
  };
  fs.writeFileSync(
    path.join(generatedDir(), "state.json"),
    JSON.stringify(state, null, 2) + "\n"
  );

  console.log(
    `[prepare] ${market.id} design=${design}: ${slugs.length} markdown guides, ${copied.length} pass-through files`
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
