import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/lib/market.js";
import { getDesignId } from "../src/config/designs.js";
import { isSiteProject, PROJECT_ROOT } from "../src/lib/project.js";

export const ROOT = PROJECT_ROOT;

/**
 * Names skipped when walking a site checkout for pass-through files and
 * URL parity. Includes the Astro app / theme so src/, dist/, public/, and
 * scripts/ are never treated as live URLs. That is what kept the template
 * parity check honest after Newport vendored a full Astro tree.
 */
export const SKIP_NAMES = new Set([
  ".git",
  ".gitignore",
  ".DS_Store",
  "wrangler.jsonc",
  "wrangler.toml",
  "wrangler.toml.example",
  "README.md",
  "_READMEFIRST.md",
  "node_modules",
  "package.json",
  "package-lock.json",
  "functions",
  "_worker.js",
  "lead magnet form links.md",
  "src",
  "dist",
  "public",
  "scripts",
  "astro.config.mjs",
  "tsconfig.json",
  ".astro",
  ".nvmrc",
  ".node-version",
  "THEME.md",
  "REPORT.md",
  "vendor",
]);

export function isSiteMode(root = ROOT) {
  return isSiteProject(root);
}

export function distDir(market = getMarket(), design = getDesignId()) {
  if (isSiteMode()) return path.join(ROOT, "dist");
  return path.join(ROOT, "dist", `${market.id}-${design}`);
}

export function publicDir() {
  return path.join(ROOT, "public");
}

export function guidesContentDir() {
  return path.join(ROOT, "src", "content", "guides");
}

export function generatedDir() {
  return path.join(ROOT, "src", "generated");
}

export function generatedGuidesDir() {
  return path.join(generatedDir(), "guides");
}

/** Convert a repo-relative file path to the URL Cloudflare would serve. */
export function fileToUrl(relPosix) {
  const rel = relPosix.replaceAll("\\", "/").replace(/^\.\/?/, "");
  if (!rel || rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) {
    return "/" + rel.slice(0, -"/index.html".length);
  }
  return "/" + rel;
}

function slugsIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
}

export function markdownSlugs(market = getMarket()) {
  const sourceDir = isSiteMode() ? guidesContentDir() : market?.contentDir;
  const fromSource = sourceDir ? slugsIn(sourceDir) : [];
  if (fromSource.length) return fromSource;
  if (market?.contentDir) return slugsIn(market.contentDir);
  return [];
}

/**
 * Walk a directory. Returns posix paths relative to `dir`.
 * Skips SKIP_NAMES. Optionally skip files via `shouldSkip(relPosix)`.
 */
export function walkFiles(dir, { shouldSkip } = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  function rec(current, rel) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_NAMES.has(entry.name)) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const childAbs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        rec(childAbs, childRel);
        continue;
      }
      if (entry.isFile()) {
        if (shouldSkip && shouldSkip(childRel)) continue;
        out.push(childRel);
      }
    }
  }

  rec(dir, "");
  return out.sort();
}

export function walkPublicFiles() {
  return walkFiles(publicDir());
}

/** Files that Astro will generate, so prepare must not copy their HTML. */
export function astroGeneratedHtml(market = getMarket()) {
  const skip = new Set([
    "index.html",
    "subscribe/index.html",
    "sitemap.xml",
    "robots.txt",
    `${market.guidesBasePath}/index.html`,
  ]);
  for (const slug of markdownSlugs(market)) {
    skip.add(`${market.guidesBasePath}/${slug}/index.html`);
  }
  return skip;
}

export function emptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function emptyDirKeeping(dir, keepNames) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  for (const name of fs.readdirSync(dir)) {
    if (keepNames.has(name)) continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}

export function findCfFile(name, market = getMarket()) {
  const candidates = [
    path.join(publicDir(), name),
    path.join(ROOT, name),
  ];
  if (market?.siteRepo) {
    candidates.push(path.join(market.siteRepo, "public", name));
    candidates.push(path.join(market.siteRepo, name));
  }
  return candidates.find((p) => fs.existsSync(p));
}
