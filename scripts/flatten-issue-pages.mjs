#!/usr/bin/env node
/**
 * Astro directory format writes `/issues/latest.html` as
 * `issues/latest.html/index.html`. Indexed URLs are the file form
 * (`/issues/latest.html`, `/issues/<date>.html`). Flatten after build.
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/config/markets.js";
import { getDesignId } from "../src/config/designs.js";
import { distDir } from "./paths.mjs";

export function flattenIssuePages(dist) {
  const issuesDir = path.join(dist, "issues");
  const moved = [];
  if (!fs.existsSync(issuesDir)) return { moved };

  for (const entry of fs.readdirSync(issuesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.endsWith(".html")) continue;
    const dir = path.join(issuesDir, entry.name);
    const index = path.join(dir, "index.html");
    if (!fs.existsSync(index)) continue;
    const html = fs.readFileSync(index, "utf8");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.writeFileSync(path.join(issuesDir, entry.name), html);
    moved.push(entry.name);
  }
  return { moved };
}

function main() {
  const market = getMarket();
  const design = getDesignId();
  const dist = distDir(market, design);
  if (!fs.existsSync(dist)) {
    throw new Error(`dist missing: ${dist}. Run astro build first.`);
  }
  const { moved } = flattenIssuePages(dist);
  console.log(
    `[flatten-issues] ${market.id}/${design}: ${moved.length} file URL(s)`
  );
}

main();
