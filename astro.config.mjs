import { defineConfig } from "astro/config";
import newsletterTheme from "./src/integration.js";
import { getMarket } from "./src/lib/market.js";
import { getDesignId } from "./src/config/designs.js";

const market = getMarket();
const design = getDesignId();

export default defineConfig({
  site: `https://${market.domain}`,
  outDir: `dist/${market.id}-${design}`,
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  integrations: [newsletterTheme()],
});
