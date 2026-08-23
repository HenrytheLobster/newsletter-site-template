#!/usr/bin/env node
/**
 * Acceptance test: every URL that exists in the live site content must
 * exist in Astro's dist/. Extra URLs (guide index, hashed assets) are
 * allowed.
 *
 * Walks the site checkout, skipping the Astro app / theme directories so
 * a converted site repo is compared against real site content only — not
 * against src/, dist/, public/, or scripts/.
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/lib/market.js";
import { getDesignId } from "../src/config/designs.js";
import {
  distDir,
  fileToUrl,
  findCfFile,
  generatedDir,
  isSiteMode,
  ROOT,
  walkFiles,
} from "./paths.mjs";

const DEPLOY_FILES = ["_redirects", ".assetsignore"];

function urlsFrom(dir) {
  return new Set(walkFiles(dir).map(fileToUrl));
}

function main() {
  const market = getMarket();
  const design = getDesignId();
  const dist = distDir(market, design);
  if (!fs.existsSync(dist)) {
    throw new Error(`dist missing: ${dist}`);
  }

  const beforeDir = isSiteMode() ? ROOT : market.siteRepo;
  const before = urlsFrom(beforeDir);
  const after = urlsFrom(dist);
  const missing = [...before].filter((url) => !after.has(url)).sort();
  const extra = [...after].filter((url) => !before.has(url)).sort();

  const deploy = {};
  for (const name of DEPLOY_FILES) {
    const expected = Boolean(findCfFile(name, market));
    const present = fs.existsSync(path.join(dist, name));
    deploy[name] = { expected, present, ok: !expected || present };
  }
  const deployMissing = Object.entries(deploy)
    .filter(([, v]) => !v.ok)
    .map(([name]) => name);

  const report = {
    market: market.id,
    design,
    domain: market.domain,
    beforeCount: before.size,
    afterCount: after.size,
    missing,
    extra,
    deploy,
    ok: missing.length === 0 && deployMissing.length === 0,
  };

  fs.writeFileSync(
    path.join(generatedDir(), `parity-${market.id}.json`),
    JSON.stringify(report, null, 2) + "\n"
  );

  console.log(
    `[parity] ${market.id}/${design}: ${before.size} before, ${after.size} after, ${missing.length} missing, ${extra.length} extra`
  );
  if (missing.length) {
    console.error("MISSING URLS:");
    for (const url of missing) console.error("  -", url);
  }
  if (deployMissing.length) {
    console.error("MISSING DEPLOY FILES:", deployMissing.join(", "));
  }
  if (!report.ok) {
    process.exit(1);
  }
  console.log(`[parity] ${market.id}/${design}: PASS`);
}

main();
