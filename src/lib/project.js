/**
 * Where this code is running: the theme package itself (previewing every
 * market) or a site repo that depends on the package (one market, dist/).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const THEME_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export const PROJECT_ROOT = process.cwd();

export const PACKAGE_NAME = "newsletter-site-theme";

export function readPackageName(root = PROJECT_ROOT) {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return "";
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).name || "";
  } catch {
    return "";
  }
}

export function isThemeProject(root = PROJECT_ROOT) {
  return readPackageName(root) === PACKAGE_NAME;
}

export function isSiteProject(root = PROJECT_ROOT) {
  return fs.existsSync(path.join(root, "src", "config", "market.js"));
}

export function dependsOnTheme(root = PROJECT_ROOT) {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return Boolean(deps[PACKAGE_NAME]);
  } catch {
    return false;
  }
}

export function generatedMarketPath(root = PROJECT_ROOT) {
  return path.join(root, "src", "generated", "market.json");
}

export function readGeneratedMarket(root = PROJECT_ROOT) {
  const file = generatedMarketPath(root);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
