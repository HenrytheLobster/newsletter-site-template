/**
 * Astro integration for newsletter-site-theme.
 *
 * Injects every shared route and the markdown plugin. site / outDir stay in
 * the project's astro.config so Astro can coerce them through its schema
 * (updateConfig would leave outDir as a bare string and the build crashes).
 */
import { fileURLToPath } from "node:url";
import { stripLeadMatter } from "./lib/strip-lead.js";

function page(rel) {
  return fileURLToPath(new URL(`./theme-pages/${rel}`, import.meta.url));
}

export default function newsletterTheme() {
  return {
    name: "newsletter-site-theme",
    hooks: {
      "astro:config:setup": ({ updateConfig, injectRoute }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [stripLeadMatter],
          },
        });

        const routes = [
          { pattern: "/", entrypoint: page("index.astro") },
          { pattern: "/about", entrypoint: page("about.astro") },
          { pattern: "/subscribe", entrypoint: page("subscribe.astro") },
          // Literal /guides/, not `[base]`: the lead magnet hrefs are
          // hardcoded to it in each market config, and `[base]` is now the
          // articles path. Emits nothing for a market with no lead magnets.
          { pattern: "/guides/[...page]", entrypoint: page("guides/[...page].astro") },
          { pattern: "/[base]", entrypoint: page("[base]/index.astro") },
          {
            pattern: "/[base]/[slug]",
            entrypoint: page("[base]/[slug].astro"),
          },
          { pattern: "/issues", entrypoint: page("issues/index.astro") },
          {
            pattern: "/issues/[name].html",
            entrypoint: page("issues/[name].html.astro"),
          },
          { pattern: "/sitemap.xml", entrypoint: page("sitemap.xml.ts") },
          { pattern: "/robots.txt", entrypoint: page("robots.txt.ts") },
        ];

        for (const route of routes) {
          injectRoute({
            pattern: route.pattern,
            entrypoint: route.entrypoint,
            prerender: true,
          });
        }
      },
    },
  };
}
