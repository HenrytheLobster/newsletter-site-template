#!/usr/bin/env node
/**
 * `newsletter-theme <command>` — build entry for a market site repo.
 *
 * Runs against process.cwd() (the site). Scripts live in this package.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const THEME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = process.cwd();
const command = process.argv[2] || "help";
const rest = process.argv.slice(3);

async function loadSiteEnv() {
  const marketFile = path.join(PROJECT_ROOT, "src", "config", "market.js");
  if (!fs.existsSync(marketFile)) return;
  const mod = await import(pathToFileURL(marketFile).href);
  const market = mod.market || mod.default;
  if (market?.id && !process.env.MARKET) process.env.MARKET = market.id;
  if (!process.env.DESIGN) process.env.DESIGN = "c";
}

function astroBin() {
  const local = path.join(PROJECT_ROOT, "node_modules", ".bin", "astro");
  if (fs.existsSync(local)) return local;
  return "astro";
}

function runNode(script, extraEnv = {}) {
  const result = spawnSync(
    process.execPath,
    [path.join(THEME_ROOT, "scripts", script), ...rest.filter((a) => a !== "--")],
    {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...extraEnv },
    }
  );
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

function runAstro(args) {
  const result = spawnSync(astroBin(), args, {
    stdio: "inherit",
    cwd: PROJECT_ROOT,
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

const CHECKS = [
  "url_parity.mjs",
  "bleed.mjs",
  "no-placeholder.mjs",
  "test-issues.mjs",
  "no-theme-dupes.mjs",
];

async function main() {
  await loadSiteEnv();

  switch (command) {
    case "prepare":
      runNode("prepare-market.mjs");
      break;
    case "flatten":
      runNode("flatten-issue-pages.mjs");
      break;
    case "copy-cf":
      runNode("copy-cf-files.mjs");
      break;
    case "parity":
      runNode("url_parity.mjs");
      break;
    case "bleed":
      runNode("bleed.mjs");
      break;
    case "no-placeholder":
      runNode("no-placeholder.mjs");
      break;
    case "test-issues":
      runNode("test-issues.mjs");
      break;
    case "no-theme-dupes":
      runNode("no-theme-dupes.mjs");
      break;
    case "dev":
      runNode("prepare-market.mjs");
      runAstro(["dev", ...rest]);
      break;
    case "preview":
      runAstro(["preview", ...rest]);
      break;
    case "build":
      runNode("prepare-market.mjs");
      runAstro(["build"]);
      runNode("flatten-issue-pages.mjs");
      runNode("copy-cf-files.mjs");
      for (const script of CHECKS) runNode(script);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(`newsletter-theme — ${THEME_ROOT}

Commands:
  build             prepare, astro build, flatten issues, copy CF files, checks
  dev               prepare, astro dev
  preview           astro preview
  prepare           copy pass-through files / issues
  parity            URL parity vs live site content
  bleed             no foreign market identity in dist
  no-placeholder    no lorem / fabricated event copy
  test-issues       issue extraction + dist shell
  no-theme-dupes    fail if this site vendors theme-owned files
`);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
