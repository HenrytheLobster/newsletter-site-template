#!/usr/bin/env node
/**
 * Cloudflare looks for `_redirects` and `.assetsignore` at the assets root.
 * Astro copies `public/` into dist, but dotfiles are easy to drop — copy
 * them explicitly after the build. wrangler.jsonc is NOT copied (it stays
 * at the site-repo root and is not ours to move).
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/lib/market.js";
import { distDir, findCfFile, ROOT } from "./paths.mjs";

const FILES = ["_redirects", ".assetsignore"];

function main() {
  const market = getMarket();
  const destRoot = distDir(market);
  if (!fs.existsSync(destRoot)) {
    throw new Error(`dist missing: ${destRoot}. Run astro build first.`);
  }
  for (const name of FILES) {
    const src = findCfFile(name, market);
    if (!src) {
      console.log(`[cf-files] ${market.id}: no ${name} in public/ or site repo (ok)`);
      continue;
    }
    fs.copyFileSync(src, path.join(destRoot, name));
    console.log(
      `[cf-files] ${market.id}: copied ${name} from ${path.relative(ROOT, src)}`
    );
  }
}

main();
