# Phase 2 report — three homepage directions

Extends the template. Writes only in `/Volumes/SSD/Projects/newsletter-site-template`.
No git push. Live site repos, platform, schedule-tool, social-poster, and the
old forks were not written to.

Built 2026-08-22.

## The three directions

| DESIGN | Direction | Optimises for | Structure in one line |
|---|---|---|---|
| **A** | Conversion-first (Hustle-shaped) | Capture the email, then scan | Slim sans header → headline + Kit form above the fold → one featured guide with photo → tight dated lists → image grid → dark lead-magnet promo (real Kit uid) → grouped roundups each ending in “See more” → dark footer |
| **B** | Local magazine (Scoop-shaped) | Browse like a paper | Full-bleed masthead bar → serif wordmark → editorial rows with right-hand thumbs → month grid + dated listings → email signup well → dense utility footer |
| **C** | Hybrid | Keep the owner’s feel, steal the useful bits | Ivory/navy/Georgia pill nav → Kit form in the hero → featured guide → this-week listings + calendar → guide tiles → navy promo |

Distinct on purpose: A is sans, rust, square, conversion-stacked. B is newsprint, wine masthead, serif, dense rows. C is the live-site palette and type with Hustle’s signup discipline and Scoop’s calendar.

Not clones. Hustle orange/black and Scoop’s teal masthead were not copied. Wording is from market config, issue manifests, and live guide titles.

## Preview commands (one per design per market)

```bash
cd /Volumes/SSD/Projects/newsletter-site-template

# A
DESIGN=a MARKET=alexandria npm run build && DESIGN=a MARKET=alexandria npm run preview:alexandria   # :4321
DESIGN=a MARKET=newport    npm run build && DESIGN=a MARKET=newport    npm run preview:newport      # :4322
DESIGN=a MARKET=wasatch    npm run build && DESIGN=a MARKET=wasatch    npm run preview:wasatch      # :4323

# B
DESIGN=b MARKET=alexandria npm run build && DESIGN=b MARKET=alexandria npm run preview:alexandria
DESIGN=b MARKET=newport    npm run build && DESIGN=b MARKET=newport    npm run preview:newport
DESIGN=b MARKET=wasatch    npm run build && DESIGN=b MARKET=wasatch    npm run preview:wasatch

# C (also the default if DESIGN is unset)
DESIGN=c MARKET=alexandria npm run build && DESIGN=c MARKET=alexandria npm run preview:alexandria
DESIGN=c MARKET=newport    npm run build && DESIGN=c MARKET=newport    npm run preview:newport
DESIGN=c MARKET=wasatch    npm run build && DESIGN=c MARKET=wasatch    npm run preview:wasatch
```

Dist is `dist/<market>-<design>/`. After a build, `npm run preview:alexandria:a` (etc.) is a shorthand.

He is choosing a direction, not proofreading. Look at alexandria A/B/C on a phone-width window first.

## Headline

`src/config/markets.js` → `home.headline`. One string per market, used by all three designs.

Factual defaults (replace these):

| Market | Default |
|---|---|
| alexandria | A weekly email of things to do around Northern Virginia. |
| newport | A weekly email of things to do in Newport News. |
| wasatch | A weekly email of things to do along the Wasatch Front. |

## What data direction B needs that does not exist yet

**A live event calendar with venue and time.**

Events today live in `newsletter-platform/markets/<id>/state/curated.json`. A Cloudflare Pages build of a site repo cannot see that file.

The site repos have **no** `events.json`. So B does not fabricate events and does not fill the month grid with placeholders.

Until an export exists, B (and C’s calendar) are driven from **this week's issue**:

- `issues/manifest.json` — real issue titles and dates
- `issues/latest.html` — real h3 / list-item titles already published

Empty calendar cells stay empty. Marked days are issue-publish days and days named in the latest issue (`Thursday, August 20`, etc.).

To get Scoop-style dated rows with venue + time, put this in the **site repo** as `events.json` (copied at prepare time):

```json
[
  {
    "title": "…from curated.json…",
    "date": "2026-08-22",
    "venue": "…",
    "time": "7:00 PM",
    "url": "https://…"
  }
]
```

That export is a prerequisite. This template will not copy `curated.json` from the platform at build time, because production Cloudflare would not have it.

Scoop’s signup asks for email **and city**. Kit forms here are email-only. B does not invent a city field that would not submit.

## Tests (3 × 3, all green)

`npm run build:designs` — parity, bleed, and no-placeholder on every combo.

| | alexandria | newport | wasatch |
|---|---|---|---|
| DESIGN=a | parity 0 missing, bleed pass, placeholder pass | same | same |
| DESIGN=b | same | same | same |
| DESIGN=c | same | same | same |

URL extras are the guide index plus hashed CSS (allowed). “You may also like” and JSON-LD Organization/WebSite/ItemList are still on markdown guides. Each market still uses its own Kit uid for the weekly form.

Alexandria A promo uses the **secret date night registry** form `a3fdb10f7b`, not the weekly uid. Newport A promo uses waterfront `614b2b6da7`. Wasatch has no separate magnet uid — promo is a link to the real guide plus the weekly form in the hero.

## Guesses (look here)

1. **A/B palettes are not the live ivory/navy.** C keeps those tokens. A is rust/ink/sans. B is wine/newsprint/serif. If a design is picked, colours can still move.
2. **Featured story on A is a real lead-magnet guide with a photo**, not this week’s issue (issues have no hero image). This week’s issue is the first rows of “Latest”.
3. **Month shown is the month of the latest issue**, not the build machine’s “today”.
4. **Issue-HTML parsing is conservative:** `h3` and `<li><a>` only. Inline paragraph links are skipped so the list does not become every URL in the email.
5. **Wasatch magnets are hiking/springs guides**, not gated Kit forms. Promo is “Open the guide”.
6. Dist path changed from `dist/<id>/` to `dist/<id>-<design>/` so all nine builds can sit side by side.
7. Default `DESIGN=c` so `MARKET=alexandria npm run build` still works.

## Live repos untouched

```
git -C newsletter-sites/novathisweek-site        status --porcelain   # empty
git -C newsletter-sites/newportnewsletter-site   status --porcelain   # empty
git -C newsletter-sites/stufftodoinutah-site     status --porcelain   # empty
```

No wrangler, no Cloudflare deploy, no Kit/Sheets/launchd/social/newsletter job. No push.
