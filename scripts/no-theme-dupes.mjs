#!/usr/bin/env node
/**
 * Drift guard: a site repo that depends on newsletter-site-theme must not
 * carry a second copy of anything the package owns. That is the failure
 * this whole split exists to prevent — a sitemap fix applied twice, three
 * markets diverging in silence.
 *
 * Also: a converted site must depend on a committed vendor tarball that
 * matches the current template pack (stale tarball is the new drift).
 * On Cloudflare there is no template checkout, so the stale check is
 * skipped and that skip is printed as SKIP, not as PASS. The tarball
 * still has to exist and be the dep.
 *
 * Unconverted static site repos (no theme dependency) are skipped.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
import {
  findTemplateSource,
  isGitHubThemeSpec,
  isVendorThemeSpec,
  packThemeTo,
  readThemeSpec,
  tarballFingerprint,
  vendorTarballPath,
} from "./tarball.mjs";

/** Sibling path that would resolve locally and fail on Cloudflare. */
const ILLEGAL_SIBLING_SPEC = "file:../newsletter-site-template";

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
  "scripts/pack-theme.sh",
  "scripts/tarball.mjs",
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

/**
 * Converted sites must depend on the committed tarball (or, later, the
 * public git URL). A `file:../newsletter-site-template` path is the
 * Cloudflare hole this check exists to catch (the template sits next to
 * the site repos). The pre-move `file:../../newsletter-site-template`
 * spec is the same hole and is also rejected.
 */
export function findTarballDrift(root, templateSource) {
  const hits = [];
  const spec = readThemeSpec(root);
  if (!spec) {
    hits.push(
      `package.json missing ${PACKAGE_NAME} (need file:./vendor/newsletter-site-theme-<version>.tgz)`
    );
    return hits;
  }
  if (isGitHubThemeSpec(spec)) return hits;
  if (!isVendorThemeSpec(spec)) {
    hits.push(
      `${PACKAGE_NAME} must be file:./vendor/newsletter-site-theme-<version>.tgz (got ${JSON.stringify(spec)})`
    );
    return hits;
  }
  const tgz = vendorTarballPath(root, spec);
  if (!tgz || !fs.existsSync(tgz)) {
    hits.push(`committed tarball missing: ${spec}`);
    return hits;
  }
  if (!templateSource) return hits;

  const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "theme-pack-"));
  try {
    const packed = packThemeTo(templateSource, packDir);
    const expected = tarballFingerprint(packed);
    const actual = tarballFingerprint(tgz);
    if (expected.hash !== actual.hash) {
      hits.push(
        `vendor tarball is stale (does not match current template pack ${expected.hash.slice(0, 12)}… vs ${actual.hash.slice(0, 12)}…). Run scripts/pack-theme.sh`
      );
    }
  } catch (err) {
    hits.push(`could not verify tarball against template: ${err.message}`);
  } finally {
    fs.rmSync(packDir, { recursive: true, force: true });
  }
  return hits;
}

/**
 * Three situations, three messages. Never print PASS in a way that reads
 * as "compared and matched" when the compare was skipped.
 */
export function formatDupesOutcome({ label, hits, templateSource }) {
  if (hits.length) {
    return {
      ok: false,
      tarballCompared: Boolean(templateSource),
      lines: [
        `[dupes] ${label}: FAIL (${hits.length} theme-source or tarball drift hits)`,
        ...hits.map((hit) => `  - ${hit}`),
      ],
    };
  }
  const lines = [`[dupes] ${label}: PASS (no vendored theme source)`];
  if (templateSource) {
    lines.push(`[dupes] ${label}: tarball matches template`);
  } else {
    lines.push(
      `[dupes] ${label}: SKIP stale-tarball compare (no template checkout — expected on Cloudflare)`
    );
  }
  return { ok: true, tarballCompared: Boolean(templateSource), lines };
}

function writeMiniTheme(dir, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: PACKAGE_NAME,
      version: "1.0.0",
      files: ["index.js"],
    })
  );
  fs.writeFileSync(path.join(dir, "index.js"), body);
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

  const tarTmp = fs.mkdtempSync(path.join(os.tmpdir(), "theme-tgz-unit-"));
  try {
    const a = path.join(tarTmp, "a");
    fs.mkdirSync(a);
    fs.writeFileSync(path.join(a, "x.txt"), "same");
    const one = path.join(tarTmp, "one.tgz");
    const two = path.join(tarTmp, "two.tgz");
    const three = path.join(tarTmp, "three.tgz");
    for (const dest of [one, two]) {
      const packed = spawnSync("tar", ["-czf", dest, "-C", a, "."], {
        encoding: "utf8",
      });
      assert.equal(packed.status, 0, packed.stderr);
    }
    assert.equal(
      tarballFingerprint(one).hash,
      tarballFingerprint(two).hash,
      "identical contents must fingerprint equal"
    );
    fs.writeFileSync(path.join(a, "x.txt"), "different");
    const packed3 = spawnSync("tar", ["-czf", three, "-C", a, "."], {
      encoding: "utf8",
    });
    assert.equal(packed3.status, 0, packed3.stderr);
    assert.notEqual(
      tarballFingerprint(one).hash,
      tarballFingerprint(three).hash,
      "changed contents must fingerprint different"
    );

    const site = path.join(tarTmp, "site");
    fs.mkdirSync(path.join(site, "src", "layouts"), { recursive: true });
    fs.writeFileSync(
      path.join(site, "package.json"),
      JSON.stringify({
        name: "example-site",
        dependencies: { [PACKAGE_NAME]: ILLEGAL_SIBLING_SPEC },
      })
    );
    const specHits = findTarballDrift(site, null);
    assert.ok(
      specHits.some((h) => h.includes("file:./vendor/")),
      `expected sibling file: spec to fail, got ${JSON.stringify(specHits)}`
    );
    fs.writeFileSync(
      path.join(site, "package.json"),
      JSON.stringify({
        name: "example-site",
        dependencies: { [PACKAGE_NAME]: "file:../../newsletter-site-template" },
      })
    );
    const oldSpecHits = findTarballDrift(site, null);
    assert.ok(
      oldSpecHits.some((h) => h.includes("file:./vendor/")),
      `expected pre-move sibling file: spec to fail, got ${JSON.stringify(oldSpecHits)}`
    );
  } finally {
    fs.rmSync(tarTmp, { recursive: true, force: true });
  }
  console.log("  ok  tarball fingerprints distinguish stale copies");
  console.log("  ok  sibling file: path is not a legal theme dep");

  const layoutTmp = fs.mkdtempSync(path.join(os.tmpdir(), "theme-layout-"));
  try {
    const packedRoot = path.join(layoutTmp, "site", "node_modules", PACKAGE_NAME);

    const sitesDir = path.join(layoutTmp, "newsletter-sites");
    const newTemplate = path.join(sitesDir, "newsletter-site-template");
    const newSite = path.join(sitesDir, "example-site");
    writeMiniTheme(newTemplate, "new-layout");
    fs.mkdirSync(newSite, { recursive: true });
    assert.equal(
      findTemplateSource(newSite, { themeRoot: packedRoot }),
      newTemplate,
      "new layout: template next to the site repos"
    );

    const oldRoot = path.join(layoutTmp, "old-layout");
    const oldTemplate = path.join(oldRoot, "newsletter-site-template");
    const oldSite = path.join(oldRoot, "newsletter-sites", "example-site");
    writeMiniTheme(oldTemplate, "old-layout");
    fs.mkdirSync(oldSite, { recursive: true });
    assert.equal(
      findTemplateSource(oldSite, { themeRoot: packedRoot }),
      oldTemplate,
      "old layout: template next to newsletter-sites/"
    );

    const lonely = path.join(layoutTmp, "cloudflare-site");
    fs.mkdirSync(lonely, { recursive: true });
    assert.equal(
      findTemplateSource(lonely, { themeRoot: packedRoot }),
      null,
      "no checkout (Cloudflare) must return null"
    );

    assert.equal(
      findTemplateSource(lonely, { themeRoot: newTemplate }),
      newTemplate,
      "a real checkout as themeRoot wins even with no sibling"
    );
  } finally {
    fs.rmSync(layoutTmp, { recursive: true, force: true });
  }
  console.log("  ok  template resolution finds the new sibling path");
  console.log("  ok  template resolution is null when the checkout is absent");

  const staleTmp = fs.mkdtempSync(path.join(os.tmpdir(), "theme-stale-"));
  try {
    const current = path.join(staleTmp, "template");
    const staleSrc = path.join(staleTmp, "stale-src");
    writeMiniTheme(current, "current-bytes");
    writeMiniTheme(staleSrc, "stale-bytes");
    const currentTgz = packThemeTo(current, path.join(staleTmp, "pack-current"));
    const staleTgz = packThemeTo(staleSrc, path.join(staleTmp, "pack-stale"));

    const site = path.join(staleTmp, "site");
    const vendor = path.join(site, "vendor");
    fs.mkdirSync(vendor, { recursive: true });
    const destTgz = path.join(vendor, "newsletter-site-theme-1.0.0.tgz");
    const vendorSpec = "file:./vendor/newsletter-site-theme-1.0.0.tgz";
    fs.writeFileSync(
      path.join(site, "package.json"),
      JSON.stringify({
        name: "example-site",
        dependencies: { [PACKAGE_NAME]: vendorSpec },
      })
    );

    fs.copyFileSync(staleTgz, destTgz);
    const staleHits = findTarballDrift(site, current);
    assert.ok(
      staleHits.some((h) => /stale/i.test(h)),
      `expected stale tarball to fail locally, got ${JSON.stringify(staleHits)}`
    );

    fs.copyFileSync(currentTgz, destTgz);
    assert.deepEqual(
      findTarballDrift(site, current),
      [],
      "matching tarball must pass when the template is present"
    );

    assert.deepEqual(
      findTarballDrift(site, null),
      [],
      "missing template must not invent a stale-tarball hit"
    );
  } finally {
    fs.rmSync(staleTmp, { recursive: true, force: true });
  }
  console.log("  ok  stale tarball fails when the template checkout is present");
  console.log("  ok  matching tarball passes when the template checkout is present");

  const matchMsg = formatDupesOutcome({
    label: "site",
    hits: [],
    templateSource: "/tmp/newsletter-site-template",
  });
  assert.equal(matchMsg.ok, true);
  assert.equal(matchMsg.tarballCompared, true);
  assert.ok(matchMsg.lines.some((l) => l.includes("PASS (no vendored theme source)")));
  assert.ok(matchMsg.lines.some((l) => l.includes("tarball matches template")));
  assert.equal(matchMsg.lines.some((l) => l.includes("no template checkout")), false);

  const staleMsg = formatDupesOutcome({
    label: "site",
    hits: ["vendor tarball is stale (does not match current template pack abcd… vs efgh…)"],
    templateSource: "/tmp/newsletter-site-template",
  });
  assert.equal(staleMsg.ok, false);
  assert.ok(staleMsg.lines.some((l) => l.includes("FAIL")));
  assert.ok(staleMsg.lines.some((l) => l.includes("stale")));

  const skipMsg = formatDupesOutcome({
    label: "site",
    hits: [],
    templateSource: null,
  });
  assert.equal(skipMsg.ok, true);
  assert.equal(skipMsg.tarballCompared, false);
  assert.ok(skipMsg.lines.some((l) => l.includes("PASS (no vendored theme source)")));
  assert.ok(skipMsg.lines.some((l) => l.includes("SKIP stale-tarball compare")));
  assert.equal(
    skipMsg.lines.some((l) => /tarball matches|tarball present/.test(l)),
    false,
    "absent-template skip must not read as compared-and-matched"
  );
  console.log("  ok  three drift-guard situations print distinct messages");
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

  const templateSource = findTemplateSource(ROOT);
  const hits = [
    ...findDupes(target),
    ...findTarballDrift(target, templateSource),
  ];
  const outcome = formatDupesOutcome({ label, hits, templateSource });
  const report = {
    market: market.id,
    target,
    owned: THEME_OWNED,
    hits,
    templateSource,
    tarballCompared: outcome.tarballCompared,
    ok: outcome.ok,
  };
  fs.mkdirSync(generatedDir(), { recursive: true });
  fs.writeFileSync(
    path.join(generatedDir(), `dupes-${market.id}.json`),
    JSON.stringify(report, null, 2) + "\n"
  );

  if (!outcome.ok) {
    for (const line of outcome.lines) console.error(line);
    process.exit(1);
  }
  for (const line of outcome.lines) {
    if (line.includes("SKIP")) console.warn(line);
    else console.log(line);
  }
}

main();
