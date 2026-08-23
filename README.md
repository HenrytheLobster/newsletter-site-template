# newsletter-site-template

One Astro site product. Three market instances. Three homepage directions,
selectable at build time with `DESIGN=a|b|c`. Same content, same URLs.

This directory is the template. It does not deploy. It does not touch the
live site repos, the platform, Kit, Sheets, or Cloudflare.

## Markets

| id | site | domain | markdown guides | live URL prefix |
|---|---|---|---|---|
| `alexandria` | NOVA This Week | novathisweek.com | 15 | `/guides/<slug>` |
| `newport` | Newport News This Week | newportnewsletter.com | 3 | `/seo/<slug>` |
| `wasatch` | Stuff To Do In Utah | stufftodoinutah.com | 10 | `/guides/<slug>` |

## Designs

Same pages. Different structure, density, type, and colour.

| DESIGN | Direction | What it is trying to win |
|---|---|---|
| `a` | Conversion-first | Email capture above the fold, one featured guide, tight lists, image grid, dark lead-magnet promo |
| `b` | Local magazine | Branded masthead, editorial rows with thumbnails, issue/event calendar, denser browse |
| `c` | Hybrid (default) | Owner ivory/navy/Georgia, Hustle signup discipline, Scoop calendar usefulness |

Headline copy lives in `src/config/markets.js` → `home.headline`. Plain factual default. Drop the owner line there; it is shared across all three designs.

## Preview commands (one per design per market)

Build first, then preview. Dist is `dist/<market>-<design>/`.

```bash
cd /Volumes/SSD/Projects/newsletter-site-template
npm install

# A — conversion-first
DESIGN=a MARKET=alexandria npm run build && DESIGN=a MARKET=alexandria npm run preview:alexandria
DESIGN=a MARKET=newport    npm run build && DESIGN=a MARKET=newport    npm run preview:newport
DESIGN=a MARKET=wasatch    npm run build && DESIGN=a MARKET=wasatch    npm run preview:wasatch

# B — local magazine
DESIGN=b MARKET=alexandria npm run build && DESIGN=b MARKET=alexandria npm run preview:alexandria
DESIGN=b MARKET=newport    npm run build && DESIGN=b MARKET=newport    npm run preview:newport
DESIGN=b MARKET=wasatch    npm run build && DESIGN=b MARKET=wasatch    npm run preview:wasatch

# C — hybrid (also the default if DESIGN is unset)
DESIGN=c MARKET=alexandria npm run build && DESIGN=c MARKET=alexandria npm run preview:alexandria
DESIGN=c MARKET=newport    npm run build && DESIGN=c MARKET=newport    npm run preview:newport
DESIGN=c MARKET=wasatch    npm run build && DESIGN=c MARKET=wasatch    npm run preview:wasatch
```

Ports: alexandria `4321`, newport `4322`, wasatch `4323`.

Shorthand after a build:

```bash
npm run preview:alexandria:a
npm run preview:alexandria:b
npm run preview:alexandria:c
```

## Build

```bash
MARKET=alexandria npm run build          # DESIGN defaults to c → dist/alexandria-c
DESIGN=a MARKET=alexandria npm run build # dist/alexandria-a

npm run build:all                        # 3 markets, current DESIGN or c
npm run build:designs                    # 3 markets × 3 designs (parity + bleed + no-placeholder)
```

Each `build` run:

1. Copies that market's markdown from `newsletter-platform/markets/<id>/content/*.md` (read-only).
2. Copies pass-through static files from the live site repo (issues, images, legacy guides, `_redirects`, `.assetsignore`).
3. Builds Astro into `dist/<id>-<design>/`.
4. Flattens issue pages so `/issues/latest.html` and `/issues/<date>.html` are files, not directories (`scripts/flatten-issue-pages.mjs`).
5. Diffs live-repo URLs against dist (`scripts/url_parity.mjs`) — **fails on any missing path**.
6. Scans dist for another market's name, domain, GA id, or Kit uid (`scripts/bleed.mjs`).
7. Scans rendered pages for lorem / placeholder / fabricated event copy (`scripts/no-placeholder.mjs`).
8. Asserts issue pages sit in the site shell, keep real issue text, do not duplicate `<html>`/`<head>`/`<body>` or the analytics tag, and that issue CSS cannot leak (`scripts/test-issues.mjs`).

## Config shape

`src/config/markets.js` — one object per market. Everything that differs
goes here: id, name, domain, region label, timezone, colours, Kit uid/src,
analytics id, nav labels, homepage copy (`home.headline` is the owner line),
featured legacy guides, lead magnets (real titles, images, Kit uids), and the
path prefix for markdown roundups (`guides` vs `seo`).

`DESIGN=a|b|c` selects chrome + homepage structure. It does not swap a market's Kit form.

## Events feed (direction B)

The site repo has no event data. Events live in
`newsletter-platform/markets/<id>/state/curated.json`, which a Cloudflare
build cannot see.

Until a curated-events export exists, B (and C's calendar) are driven from
**this week's issue** (`issues/latest.html` + `issues/manifest.json`) — real
titles and dates already in the site repo. Empty calendar cells stay empty.

To populate a Scoop-style dated list with venue and time, copy this file
into the site repo as `events.json`:

```json
[
  {
    "title": "Event name from curated.json",
    "date": "2026-08-22",
    "venue": "Venue name",
    "time": "7:00 PM",
    "url": "https://…"
  }
]
```

`prepare-market` copies it when present. Do not invent rows.

## What is generated vs passed through

**Astro renders**

- `/`, `/subscribe`
- markdown roundups at `/{guidesBasePath}/{slug}`
- a guide index at `/{guidesBasePath}/` (new URL; existing slugs unchanged)
- issue pages at `/issues/`, `/issues/latest.html`, `/issues/<date>.html` (site header/nav/footer around the email body; `.html` URLs unchanged)
- `sitemap.xml`, `robots.txt`

**Passed through unchanged** (so their URLs survive)

- `issues/manifest.json`
- legacy gated guides (`guide.html`, images, `guide-gate.css/js`)
- `images/`
- `_redirects`, `.assetsignore`
- `fireworks-dc.html`, `guides/date-night.html`, Newport `/seo/best-free-museums-newport-news`, etc.

`wrangler.jsonc` stays in the site repo root.

## Site repos (pilot)

`newportnewsletter-site` is the first live instance. It vendors a copy of
this theme (provisional — the long-term sharing model is not chosen) and
builds **one** market into `dist/` rather than `dist/<market>-<design>/`.
A fix here is not live on Newport until someone runs that repo's
`scripts/sync-theme.sh` on purpose.

## Safety

Writes only happen in this directory. The live site repos, the platform,
schedule-tool, and social-poster are read-only.
