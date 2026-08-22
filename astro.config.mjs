import { defineConfig } from "astro/config";
import { getMarket } from "./src/config/markets.js";
import { getDesignId } from "./src/config/designs.js";
import { stripLeadMatter } from "./src/lib/strip-lead.js";

const market = getMarket();
const design = getDesignId();

export default defineConfig({
  site: `https://${market.domain}`,
  outDir: `dist/${market.id}-${design}`,
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  markdown: {
    remarkPlugins: [stripLeadMatter],
  },
});
