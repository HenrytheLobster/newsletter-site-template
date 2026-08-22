import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMarket } from "../src/config/markets.js";
import { getDesignId } from "../src/config/designs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SKIP_NAMES = new Set([
  ".git",
  ".gitignore",
  ".DS_Store",
  "wrangler.jsonc",
  "README.md",
  "_READMEFIRST.md",
  "node_modules",
  "package.json",
  "package-lock.json",
  "functions",
  "_worker.js",
  "lead magnet form links.md",
]);

export function distDir(market = getMarket(), design = getDesignId()) {
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

/** Convert a repo-relative file path to the URL Cloudflare Pages would serve. */
export function fileToUrl(relPosix) {
  const rel = relPosix.replaceAll("\\", "/").replace(/^\.\/?/, "");
  if (!rel || rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) {
    return "/" + rel.slice(0, -"/index.html".length);
  }
  return "/" + rel;
}

export function markdownSlugs(market = getMarket()) {
  if (!fs.existsSync(market.contentDir)) return [];
  return fs
    .readdirSync(market.contentDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
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
