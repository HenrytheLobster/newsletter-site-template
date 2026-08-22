import type { APIRoute } from "astro";
import { getMarket, siteUrl } from "../lib/market.js";

export const GET: APIRoute = () => {
  const market = getMarket();
  const body = `User-agent: *
Allow: /

Sitemap: ${siteUrl(market)}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
