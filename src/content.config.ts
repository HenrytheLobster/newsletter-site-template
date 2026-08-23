import path from "node:path";
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const dateish = z
  .union([z.string(), z.date()])
  .transform((value) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  );

const lastVerified = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === "null" || value === "") return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  });

const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (value == null ? "" : value));

/**
 * Schema derived from the actual frontmatter in
 * newsletter-platform/markets/<id>/content/*.md (28 files).
 *
 * Always present: slug, title, description, intro, status, place,
 * source_host, include_patterns, exclude_patterns, min_dates, generated,
 * last_verified, gated, entry_count, location_count, verification_required.
 *
 * Optional: archetype (missing on all 3 newport files), hero_image /
 * social_image / alts (only newport/best-live-music-newport-news).
 */
const guides = defineCollection({
  loader: glob({
    pattern: "*.md",
    // cwd, not this package — site repos keep their own markdown.
    base: path.resolve("src/content/guides"),
  }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    intro: z.string(),
    status: z.string(),
    place: z.string(),
    source_host: optionalString,
    include_patterns: z.array(z.string()).default([]),
    exclude_patterns: z.array(z.string()).default([]),
    min_dates: z.number(),
    generated: dateish,
    last_verified: lastVerified,
    gated: z.boolean(),
    entry_count: z.number(),
    location_count: z.number(),
    verification_required: z.boolean(),
    archetype: z.string().optional(),
    hero_image: z.string().optional(),
    social_image: z.string().optional(),
    hero_image_alt: z.string().optional(),
    social_image_alt: z.string().optional(),
  }),
});

export const collections = { guides };
