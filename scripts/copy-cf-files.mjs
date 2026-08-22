#!/usr/bin/env node
/**
 * Cloudflare looks for `_redirects` and `.assetsignore` at the assets root.
 * Astro copies `public/` into dist, but dotfiles are easy to drop — copy
 * them explicitly after the build. wrangler.jsonc is NOT copied (it stays
 * at the site-repo root and is not ours to move).
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/config/markets.js";
import { distDir } from "./paths.mjs";

const FILES = ["_redirects", ".assetsignore"];

function main() {
  const market = getMarket();
  const destRoot = distDir(market);
  if (!fs.existsSync(destRoot)) {
    throw new Error(`dist missing: ${destRoot}. Run astro build first.`);
  }
  for (const name of FILES) {
    const src = path.join(market.siteRepo, name);
    if (!fs.existsSync(src)) {
      console.log(`[cf-files] ${market.id}: no ${name} in site repo (ok)`);
      continue;
    }
    fs.copyFileSync(src, path.join(destRoot, name));
    console.log(`[cf-files] ${market.id}: copied ${name}`);
  }
}

main();
