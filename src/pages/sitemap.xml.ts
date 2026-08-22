import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getMarket, guidePath, guidesIndexPath, siteUrl } from "../lib/market.js";

export const GET: APIRoute = async () => {
  const market = getMarket();
  const origin = siteUrl(market);
  const guides = await getCollection("guides");

  const urls = new Set<string>([
    `${origin}/`,
    `${origin}/subscribe`,
    `${origin}${guidesIndexPath(market)}`,
    `${origin}/issues`,
    `${origin}/issues/latest.html`,
  ]);

  for (const g of guides) {
    urls.add(`${origin}${guidePath(market, g.data.slug)}`);
  }

  for (const item of market.featuredLegacy) {
    const href = item.href.endsWith("/") ? item.href.slice(0, -1) : item.href;
    urls.add(`${origin}${href}`);
  }

  const statePath = path.resolve("src/generated/state.json");
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    for (const htmlPath of state.passthroughHtml || []) {
      urls.add(`${origin}${htmlPath === "/" ? "" : htmlPath}`);
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls]
  .sort()
  .map(
    (loc) => `  <url>
    <loc>${loc}</loc>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
