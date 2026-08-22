#!/usr/bin/env node
/**
 * 3 markets × 3 designs. Parity, bleed, and placeholder checks run per build.
 */
import { spawnSync } from "node:child_process";
import { MARKET_IDS } from "../src/config/markets.js";
import { DESIGN_IDS } from "../src/config/designs.js";

let failed = 0;
for (const design of DESIGN_IDS) {
  for (const market of MARKET_IDS) {
    console.log(`\n======== DESIGN=${design} MARKET=${market} ========`);
    const result = spawnSync("npm", ["run", "build"], {
      stdio: "inherit",
      env: { ...process.env, MARKET: market, DESIGN: design },
    });
    if (result.status !== 0) {
      failed += 1;
      console.error(`FAIL DESIGN=${design} MARKET=${market}`);
    }
  }
}

if (failed) {
  console.error(`\n[build:designs] ${failed} of ${DESIGN_IDS.length * MARKET_IDS.length} failed`);
  process.exit(1);
}
console.log(
  `\n[build:designs] PASS ${DESIGN_IDS.length} designs × ${MARKET_IDS.length} markets`
);
