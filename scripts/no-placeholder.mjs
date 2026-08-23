#!/usr/bin/env node
/**
 * A design must not ship placeholder, lorem, or fabricated event copy.
 * Scans Astro-rendered HTML (home, subscribe, guide index, markdown guides,
 * issue archive). Dated issue files are the published newsletter and are
 * not scanned for placeholder event copy.
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/lib/market.js";
import { getDesignId } from "../src/config/designs.js";
import { distDir, generatedDir } from "./paths.mjs";

const FORBIDDEN = [
  /lorem ipsum/i,
  /\blorem\b/i,
  /placeholder event/i,
  /sample event/i,
  /fake event/i,
  /example event/i,
  /upcoming event here/i,
  /your event here/i,
  /event title here/i,
  /coming soon/i,
  /\[event[^\]]*\]/i,
  /dummy event/i,
  /foo bar/i,
  /insert event/i,
  /tbd event/i,
  /venue tbd/i,
  /time tbd/i,
];

function stripNoise(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function astroPages(dist, market) {
  const pages = [
    "index.html",
    path.join("subscribe", "index.html"),
    path.join("issues", "index.html"),
  ];
  const guideIndex = path.join(market.guidesBasePath, "index.html");
  pages.push(guideIndex);
  const guidesDir = path.join(dist, market.guidesBasePath);
  if (fs.existsSync(guidesDir)) {
    for (const name of fs.readdirSync(guidesDir)) {
      const index = path.join(guidesDir, name, "index.html");
      if (fs.existsSync(index)) {
        pages.push(path.join(market.guidesBasePath, name, "index.html"));
      }
    }
  }
  return pages.filter((rel) => fs.existsSync(path.join(dist, rel)));
}

function main() {
  const market = getMarket();
  const design = getDesignId();
  const dist = distDir(market, design);
  if (!fs.existsSync(dist)) {
    throw new Error(`dist missing: ${dist}`);
  }

  const hits = [];
  for (const rel of astroPages(dist, market)) {
    const abs = path.join(dist, rel);
    const text = stripNoise(fs.readFileSync(abs, "utf8"));
    for (const pattern of FORBIDDEN) {
      const match = text.match(pattern);
      if (match) {
        hits.push({ file: rel, pattern: String(pattern), snippet: match[0] });
      }
    }
  }

  const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  if (/lorem/i.test(stripNoise(home))) {
    hits.push({ file: "index.html", pattern: "lorem", snippet: "lorem" });
  }

  const report = {
    market: market.id,
    design,
    hits,
    ok: hits.length === 0,
  };
  fs.writeFileSync(
    path.join(generatedDir(), `placeholder-${market.id}-${design}.json`),
    JSON.stringify(report, null, 2) + "\n"
  );

  if (hits.length) {
    console.error(
      `[placeholder] ${market.id}/${design}: FAIL (${hits.length} hits)`
    );
    for (const hit of hits) {
      console.error(`  ${hit.file}: ${hit.pattern} → ${hit.snippet}`);
    }
    process.exit(1);
  }
  console.log(
    `[placeholder] ${market.id}/${design}: PASS (no lorem/placeholder/fabricated event text)`
  );
}

main();
