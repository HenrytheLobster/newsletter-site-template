#!/usr/bin/env node
/**
 * Drift guard: a site repo that depends on newsletter-site-theme must not
 * carry a second copy of anything the package owns. That is the failure
 * this whole split exists to prevent — a sitemap fix applied twice, three
 * markets diverging in silence.
 *
 * Unconverted static site repos (no theme dependency) are skipped.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getMarket } from "../src/lib/market.js";
import {
  dependsOnTheme,
  isSiteProject,
  PACKAGE_NAME,
  THEME_ROOT,
} from "../src/lib/project.js";
import { generatedDir, isSiteMode, ROOT } from "./paths.mjs";

/** Paths the shared package owns. Presence in a site repo is a fail. */
export const THEME_OWNED = [
  "src/layouts",
  "src/components",
  "src/styles",
  "src/lib",
  "src/pages",
  "src/theme-pages",
  "src/config/designs.js",
  "src/config/markets.js",
  "src/integration.js",
  "scripts/bleed.mjs",
  "scripts/flatten-issue-pages.mjs",
  "scripts/no-placeholder.mjs",
  "scripts/test-issues.mjs",
  "scripts/copy-cf-files.mjs",
  "scripts/prepare-market.mjs",
  "scripts/paths.mjs",
  "scripts/url_parity.mjs",
  "scripts/cli.mjs",
  "scripts/no-theme-dupes.mjs",
  "scripts/build-designs.mjs",
  "scripts/sync-theme.sh",
];

function existsIn(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function contentConfigIsLocalCopy(root) {
  const file = path.join(root, "src", "content.config.ts");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("defineCollection")) return true;
  if (text.includes(PACKAGE_NAME)) return false;
  return true;
}

function astroConfigDuplicatesTheme(root) {
  const file = path.join(root, "astro.config.mjs");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf8");
  return text.includes("stripLeadMatter") || text.includes("remarkPlugins");
}

export function findDupes(root) {
  const hits = [];
  for (const rel of THEME_OWNED) {
    if (existsIn(root, rel)) hits.push(rel);
  }
  if (contentConfigIsLocalCopy(root)) {
    hits.push("src/content.config.ts (local schema copy; re-export from the package)");
  }
  if (astroConfigDuplicatesTheme(root)) {
    hits.push("astro.config.mjs (theme markdown/plugin config; use the integration)");
  }
  return hits;
}

/** Package-owned paths that this repo itself must still contain. */
const PACKAGE_MUST_HAVE = THEME_OWNED.filter(
  (rel) => rel !== "scripts/sync-theme.sh" && rel !== "src/pages"
);

function unitTests() {
  console.log("[dupes] unit");
  for (const rel of PACKAGE_MUST_HAVE) {
    assert.ok(
      existsIn(THEME_ROOT, rel),
      `theme package is missing ${rel} — the drift list is stale`
    );
  }
  assert.equal(existsIn(THEME_ROOT, "scripts/sync-theme.sh"), false);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "theme-dupes-"));
  try {
    assert.deepEqual(findDupes(tmp), [], "empty dir must pass");
    fs.mkdirSync(path.join(tmp, "src", "layouts"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "src", "layouts", "BaseLayout.astro"), "---\n---\n");
    const hits = findDupes(tmp);
    assert.ok(
      hits.includes("src/layouts"),
      `expected src/layouts to fail, got ${JSON.stringify(hits)}`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log("  ok  duplicated layouts fail the guard");
  console.log("  ok  package still owns the listed files");
}

function main() {
  unitTests();

  let market;
  try {
    market = getMarket();
  } catch {
    console.log("[dupes] no market in env (unit only)");
    return;
  }
  const target = isSiteMode() ? ROOT : market.siteRepo;
  const label = isSiteProject() ? "site" : `siteRepo:${market.id}`;

  if (!dependsOnTheme(target) && !isSiteProject(target)) {
    console.log(
      `[dupes] ${market.id}: skip (not a theme consumer yet)`
    );
    return;
  }

  const hits = findDupes(target);
  const report = {
    market: market.id,
    target,
    owned: THEME_OWNED,
    hits,
    ok: hits.length === 0,
  };
  fs.mkdirSync(generatedDir(), { recursive: true });
  fs.writeFileSync(
    path.join(generatedDir(), `dupes-${market.id}.json`),
    JSON.stringify(report, null, 2) + "\n"
  );

  if (hits.length) {
    console.error(
      `[dupes] ${label}: FAIL (${hits.length} copies of theme-owned files)`
    );
    for (const hit of hits) console.error(`  - ${hit}`);
    process.exit(1);
  }
  console.log(`[dupes] ${label}: PASS (no vendored theme files)`);
}

main();
