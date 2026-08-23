/**
 * Pack + fingerprint the theme tarball. Used by the drift guard so a
 * converted site cannot ship a stale vendor copy, and by pack-theme.sh
 * (via npm pack) for the same bytes.
 *
 * Fingerprint is a SHA-256 of extracted file paths + contents, not the
 * gzip bytes, so tar-header noise cannot false-fail the check.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isThemeProject, PACKAGE_NAME, THEME_ROOT } from "../src/lib/project.js";

export const VENDOR_SPEC_RE =
  /^file:(\.\/vendor\/newsletter-site-theme-.+\.tgz)$/;

export const GITHUB_SPEC_RE =
  /^(github:HenrytheLobster\/newsletter-site-template(?:#.+)?|git\+https:\/\/github\.com\/HenrytheLobster\/newsletter-site-template(?:\.git)?(?:#.+)?)$/;

export function readThemeSpec(root) {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return "";
  try {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return deps[PACKAGE_NAME] || "";
  } catch {
    return "";
  }
}

export function vendorTarballPath(root, spec = readThemeSpec(root)) {
  const match = String(spec).match(VENDOR_SPEC_RE);
  if (!match) return null;
  return path.resolve(root, match[1]);
}

export function isGitHubThemeSpec(spec) {
  return GITHUB_SPEC_RE.test(String(spec));
}

export function isVendorThemeSpec(spec) {
  return VENDOR_SPEC_RE.test(String(spec));
}

const TEMPLATE_DIR_NAME = "newsletter-site-template";

/** A real checkout, not the copy npm extracted into node_modules. */
export function isUsableTemplateCheckout(root) {
  if (!root) return false;
  if (root.split(path.sep).includes("node_modules")) return false;
  return isThemeProject(root);
}

/**
 * Layouts to try when this code is running from a site repo (THEME_ROOT is
 * the packed install under node_modules). Newest first:
 *   ../newsletter-site-template   — template sits next to the site repos
 *   ../../newsletter-site-template — pre-move layout, template next to newsletter-sites/
 * Cloudflare has neither.
 */
export function templateSourceCandidates(projectRoot) {
  return [
    path.resolve(projectRoot, "..", TEMPLATE_DIR_NAME),
    path.resolve(projectRoot, "..", "..", TEMPLATE_DIR_NAME),
  ];
}

/**
 * Template git checkout, or null on Cloudflare (no sibling).
 *
 * `themeRoot` is injectable so tests can simulate a packed install without
 * the real checkout short-circuiting the sibling search.
 */
export function findTemplateSource(projectRoot, { themeRoot = THEME_ROOT } = {}) {
  if (isUsableTemplateCheckout(themeRoot)) return themeRoot;
  for (const candidate of templateSourceCandidates(projectRoot)) {
    if (isUsableTemplateCheckout(candidate)) return candidate;
  }
  return null;
}

export function tarballFingerprint(tgzPath) {
  if (!fs.existsSync(tgzPath)) {
    throw new Error(`tarball missing: ${tgzPath}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "theme-tgz-"));
  try {
    const extracted = spawnSync("tar", ["-xzf", tgzPath, "-C", tmp], {
      encoding: "utf8",
    });
    if ((extracted.status ?? 1) !== 0) {
      throw new Error(
        `tar extract failed for ${tgzPath}: ${extracted.stderr || extracted.stdout}`
      );
    }
    const files = [];
    function rec(dir, rel) {
      for (const name of fs.readdirSync(dir)) {
        const abs = path.join(dir, name);
        const childRel = rel ? `${rel}/${name}` : name;
        const st = fs.statSync(abs);
        if (st.isDirectory()) rec(abs, childRel);
        else if (st.isFile()) files.push(childRel);
      }
    }
    rec(tmp, "");
    files.sort();
    const hash = createHash("sha256");
    for (const rel of files) {
      hash.update(rel);
      hash.update("\0");
      hash.update(fs.readFileSync(path.join(tmp, rel)));
      hash.update("\0");
    }
    return { hash: hash.digest("hex"), files: files.length };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function packThemeTo(themeRoot, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const result = spawnSync("npm", ["pack", "--pack-destination", destDir], {
    cwd: themeRoot,
    encoding: "utf8",
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`npm pack failed: ${result.stderr || result.stdout}`);
  }
  const printed = (result.stdout || "").trim().split("\n").filter(Boolean);
  const name = printed.pop();
  const tgz = path.join(destDir, name);
  if (!fs.existsSync(tgz)) {
    throw new Error(`npm pack did not produce ${tgz}`);
  }
  return tgz;
}
