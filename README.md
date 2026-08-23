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

Each site depends on a **committed tarball** of this package:

```json
"newsletter-site-theme": "file:./vendor/newsletter-site-theme-1.0.0.tgz"
```

`npm ci` installs from that file with no network and no auth, so Cloudflare
Workers Builds (which checks out only the site repo) can build. The theme
SOURCE stays here; each site carries a built artifact, not a second copy
of the source.

This is a bridge to a public GitHub repo. `gh repo create` is blocked for
agents, so the git-URL route is unavailable until the owner creates it.

### Propagate a theme fix (one command)

```bash
cd /Volumes/SSD/Projects/newsletter-sites/newsletter-site-template
scripts/pack-theme.sh
# then in each site: commit vendor/*.tgz + package.json + package-lock.json
```

The drift guard fails a site build if it still contains theme source
(e.g. its own `src/layouts`) or if the committed tarball does not match
the current pack of this repo.

### Later: one-line swap to the git URL

Once the owner has created and pushed
`github.com/HenrytheLobster/newsletter-site-template` (public), each site
changes one line:

```json
"newsletter-site-theme": "github:HenrytheLobster/newsletter-site-template"
```

Then `npm install` and commit `package.json` + `package-lock.json`. After
that, a theme fix is: push this repo, `npm update newsletter-site-theme` in
the site, commit the lockfile.

| Option | Cloudflare `npm ci` | What the owner does every fix | Tradeoff |
|---|---|---|---|
| **Committed tarball** (now) | installs from `vendor/*.tgz`, no auth | `scripts/pack-theme.sh`, commit the tarball + lockfile in each site | extra binary in git; one command to refresh |
| **Public GitHub + git URL** (next) | clones, no auth | push this repo, then `npm update newsletter-site-theme` in the site and commit the lockfile | theme source is public; Kit/GA ids already are, in the live HTML |
| Private GitHub + token | needs `GITHUB_TOKEN` in the build env and an `.npmrc` | same, plus token rotation | more moving parts for a theme that is not secret |
| npmjs publish | `npm ci` from the registry | `npm publish` on every fix, then bump the site | extra account and a publish step we do not need |

## Preview commands (this package)

Build first, then preview. Dist is `dist/<market>-<design>/`.

```bash
cd /Volumes/SSD/Projects/newsletter-sites/newsletter-site-template
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
9. Fails if a converted site repo still vendors theme source (e.g. its own `src/layouts`) or if the committed vendor tarball does not match a fresh pack of this repo (`scripts/no-theme-dupes.mjs`).

## Markets

| id | site | domain | markdown guides | live URL prefix |
|---|---|---|---|---|
| `alexandria` | NOVA This Week | novathisweek.com | 15 | `/guides/<slug>` |
| `newport` | Newport News This Week | newportnewsletter.com | 3 | `/guides/<slug>` |
| `wasatch` | Stuff To Do In Utah | stufftodoinutah.com | 10 | `/guides/<slug>` |

All three markets are converted: each depends on the committed tarball and
builds one market into `dist/`. Worker names are not interchangeable —
`novathisweek`, `newport-newsletter`, `wasatch-newsletter`.

## Designs

Same pages. Different structure, density, type, and colour. `DESIGN=a|b|c`.
Default `c`. Headline copy lives in the market config → `home.headline`.

## Safety

Writes only happen in this directory and, when converting a market, in that
market's site repo. Never `git push`. Never `gh repo create`. Never
Cloudflare / wrangler deploy / Kit / Sheets / launchd / social / mail.
