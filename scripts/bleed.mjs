#!/usr/bin/env node
/**
 * A build for one market must never emit another market's name, domain,
 * colour (as a unique token — colours currently match, so we skip them),
 * GA id, or Kit uid.
 */
import fs from "node:fs";
import path from "node:path";
import { getMarket, foreignIdentifiers } from "../src/lib/market.js";
import { getDesignId } from "../src/config/designs.js";
import { distDir, generatedDir, walkFiles } from "./paths.mjs";

const SCAN_EXT = new Set([
  ".html",
  ".js",
  ".css",
  ".xml",
  ".txt",
  ".json",
  ".svg",
  ".mjs",
]);

function main() {
  const market = getMarket();
  const design = getDesignId();
  const dist = distDir(market, design);
  if (!fs.existsSync(dist)) {
    throw new Error(`dist missing: ${dist}`);
  }

  const needles = foreignIdentifiers(market.id);
  const hits = [];

  for (const rel of walkFiles(dist)) {
    if (!SCAN_EXT.has(path.extname(rel).toLowerCase())) continue;
    const abs = path.join(dist, rel);
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    for (const needle of needles) {
      if (text.includes(needle.value)) {
        hits.push({ file: rel, kind: needle.kind, value: needle.value });
      }
    }
  }

  const required = [
    { kind: "name", value: market.name },
    { kind: "domain", value: market.domain },
    { kind: "analyticsId", value: market.analyticsId },
    { kind: "kitUid", value: market.kit.uid },
  ];
  const htmlFiles = walkFiles(dist).filter((rel) => rel.endsWith(".html"));
  const html = htmlFiles
    .map((rel) => fs.readFileSync(path.join(dist, rel), "utf8"))
    .join("\n");
  const missingOwn = required.filter((item) => !html.includes(item.value));

  const report = {
    market: market.id,
    design,
    scannedFor: needles,
    hits,
    missingOwn,
    ok: hits.length === 0 && missingOwn.length === 0,
  };
  fs.writeFileSync(
    path.join(generatedDir(), `bleed-${market.id}.json`),
    JSON.stringify(report, null, 2) + "\n"
  );

  if (hits.length) {
    console.error(`[bleed] ${market.id}/${design}: FAIL (${hits.length} foreign hits)`);
    for (const hit of hits.slice(0, 40)) {
      console.error(`  ${hit.kind} ${hit.value} in ${hit.file}`);
    }
    if (hits.length > 40) console.error(`  … ${hits.length - 40} more`);
  }
  if (missingOwn.length) {
    console.error(`[bleed] ${market.id}/${design}: missing own identifiers:`);
    for (const item of missingOwn) console.error(`  ${item.kind} ${item.value}`);
  }
  if (!report.ok) process.exit(1);
  console.log(`[bleed] ${market.id}/${design}: PASS (no foreign name/domain/GA/Kit)`);
}

main();
