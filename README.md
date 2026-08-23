# newsletter-site-theme

One shared Astro theme. Three market sites install it. A fix lands once.

This repo is the package (`newsletter-site-theme`). It does not deploy. It
does not touch Kit, Sheets, Cloudflare, or the live site repos except to
*read* them when you preview a market locally.

## What lives where

**This package** owns layouts, components, styles, designs A/B/C, issue
extraction and CSS scoping, guide rendering, related-guides, JSON-LD,
sitemap and robots, and the verification scripts (parity, bleed,
placeholder, issue tests, drift guard).

**Each market repo** owns its market config (name, domain, region, colours,
Kit uid, GA id, nav labels, headline), its content (`src/content/guides/`
markdown, `issues/`, `images/` / legacy `guides/`), `wrangler.jsonc`,
`public/_redirects`, `public/.assetsignore`, and a thin `package.json` +
`astro.config.mjs`.

If something is ambiguous it goes in this package.

## Install (a market repo)

Until the GitHub repo exists, local development uses a path dependency:

```json
"newsletter-site-theme": "file:../../newsletter-site-template"
```

That is what Newport is committed with, so `npm ci && npm run build` works
from a clean checkout on this machine. It will **not** work on Cloudflare
Workers Builds — there is no sibling checkout in that container.

### Distribution: public GitHub repo, git URL

Chosen over a private repo + build token, and over npmjs:

| Option | Cloudflare `npm ci` | What the owner does every fix | Tradeoff |
|---|---|---|---|
| **Public GitHub + git URL** (chosen) | clones, no auth | push this repo, then `npm update newsletter-site-theme` in the site and commit the lockfile | theme source is public; Kit/GA ids already are, in the live HTML |
| Private GitHub + token | needs `GITHUB_TOKEN` in the build env and an `.npmrc` | same, plus token rotation | more moving parts for a theme that is not secret |
| npmjs publish | `npm ci` from the registry | `npm publish` on every fix, then bump the site | extra account and a publish step we do not need |

The owner creates the GitHub repo himself (`gh repo create` is blocked for
agents). Suggested name matches this folder. The package is already shaped
so the moment that repo exists:

```bash
# 1. Create the public repo and push this package (owner machine)
cd /Volumes/SSD/Projects/newsletter-site-template
git remote add origin git@github.com:HenrytheLobster/newsletter-site-template.git
# then, in the GitHub UI or: gh repo create HenrytheLobster/newsletter-site-template --public --source=. --remote=origin
git push -u origin main

# 2. Point each site at the git URL (repeat per market)
cd /Volumes/SSD/Projects/newsletter-sites/newportnewsletter-site
npm install github:HenrytheLobster/newsletter-site-template
npm ci
npm run build
# commit package.json + package-lock.json, then the owner pushes
```

`npm ci` on Cloudflare then clones the public repo. The lockfile pins the
commit. No interactive auth.

A later theme fix:

```bash
cd /Volumes/SSD/Projects/newsletter-site-template
# commit, owner pushes
cd /Volumes/SSD/Projects/newsletter-sites/newportnewsletter-site
npm update newsletter-site-theme
npm run build
# commit the lockfile, owner pushes
```

## Preview commands (this package)

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

```bash
MARKET=alexandria npm run build          # DESIGN defaults to c → dist/alexandria-c
DESIGN=a MARKET=alexandria npm run build # dist/alexandria-a
npm run build:all                        # 3 markets, current DESIGN or c
npm run build:designs                    # 3 markets × 3 designs
```

Each `build` run:

1. Copies that market's markdown from `newsletter-platform/markets/<id>/content/*.md` (read-only). If the site repo already has `src/config/market.js`, that file is the live config.
2. Copies pass-through static files from the live site repo (issues, images, legacy guides, `_redirects`, `.assetsignore`). Skips the Astro app tree so a converted site is not counted as 197 public URLs.
3. Builds Astro into `dist/<id>-<design>/`.
4. Flattens issue pages so `/issues/latest.html` is a file, not a directory.
5. Diffs live-repo **content** URLs against dist (`scripts/url_parity.mjs`) — fails on any missing path.
6. Scans dist for another market's name, domain, GA id, or Kit uid.
7. Scans rendered pages for lorem / placeholder / fabricated event copy.
8. Asserts issue pages sit in the site shell and that issue CSS cannot leak.
9. Fails if a converted site repo still vendors a copy of something this package owns (`scripts/no-theme-dupes.mjs`).

## Markets

| id | site | domain | markdown guides | live URL prefix |
|---|---|---|---|---|
| `alexandria` | NOVA This Week | novathisweek.com | 15 | `/guides/<slug>` |
| `newport` | Newport News This Week | newportnewsletter.com | 3 | `/guides/<slug>` |
| `wasatch` | Stuff To Do In Utah | stufftodoinutah.com | 10 | `/guides/<slug>` |

Newport is converted: it depends on this package and builds one market into
`dist/`. Alexandria and Wasatch are still the pre-Astro static repos;
convert them the same way (see REPORT.md).

## Designs

Same pages. Different structure, density, type, and colour. `DESIGN=a|b|c`.
Default `c`. Headline copy lives in the market config → `home.headline`.

## Safety

Writes only happen in this directory and, when converting a market, in that
market's site repo. Never `git push`. Never `gh repo create`. Never
Cloudflare / wrangler deploy / Kit / Sheets / launchd / social / mail.
