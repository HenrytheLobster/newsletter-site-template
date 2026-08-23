# Shared theme package — committed tarball

Built 2026-08-23. Writes in `newsletter-sites/newsletter-site-template`
and all three site repos under `newsletter-sites/`. The template used to
live at `/Volumes/SSD/Projects/newsletter-site-template`; that path is
gone. No git push. No `gh repo create`. No Cloudflare / wrangler deploy /
Kit / Sheets / launchd / social / mail.

## The split

**Shared package (`newsletter-site-theme`, this repo)**

Layouts, components, styles, designs A/B/C, issue extraction and CSS
scoping, guide rendering, related-guides, JSON-LD, sitemap and robots,
prepare / flatten / copy-cf, and the verification scripts (parity, bleed,
placeholder, issue tests, drift guard). Pages live in `src/theme-pages/`
and are `injectRoute`d so a site repo has no `src/pages`.

**Per-market site repo**

`src/config/market.js` (name, domain, region, colours, Kit uid, GA id, nav,
headline, featured guides, lead magnets), content (`src/content/guides/`
markdown, `issues/`, legacy `guides/` / images), `wrangler.jsonc`,
`public/_redirects`, `public/.assetsignore`, thin `package.json` +
`astro.config.mjs`, a one-line `src/content.config.ts` re-export, and
`vendor/newsletter-site-theme-<version>.tgz`.

The catalog at `src/config/markets.js` stays here so template preview can
still build all three markets and so `bleed.mjs` knows every foreign
name/domain/GA/Kit token. A converted site’s `src/config/market.js` wins
for that market (prepare overlays it). `siteRepo` / `contentDir` stay in
the catalog — those paths are the owner’s machine, and Cloudflare never
sees them.

## Distribution: committed tarball (bridge to public git)

`gh repo create` is blocked, so the git-URL route is unavailable tonight.
Cloudflare’s build container checks out **only** the site repo and runs
`npm ci`. A sibling `file:../newsletter-site-template` path works on this
machine (the template sits next to the site repos) and cannot work there.
The pre-move `file:../../newsletter-site-template` path is the same hole
and no longer resolves even locally.

Fix: `npm pack` this package, commit the `.tgz` inside each site, depend
on it by relative path:

```
"newsletter-site-theme": "file:./vendor/newsletter-site-theme-1.0.0.tgz"
```

`npm ci` installs from that tarball with no network and no auth.
The theme SOURCE stays single-origin in this repo. Each site carries a
built artifact, not a second copy of the source.

### Propagate a theme fix (one command)

```bash
cd /Volumes/SSD/Projects/newsletter-sites/newsletter-site-template
scripts/pack-theme.sh
```

That rebuilds the tarball, copies it into all three site repos, and
writes each lockfile’s integrity hash from the bytes just copied.
(`npm install --package-lock-only` does **not** refresh that hash when
the version and `file:` spec stay the same, so `npm ci` would reinstall
a cached old pack.) Commit in each site:

- `vendor/newsletter-site-theme-1.0.0.tgz`
- `package.json`
- `package-lock.json`

### Later: one-line swap to the git URL

When the owner creates `github.com/HenrytheLobster/newsletter-site-template`
(public), each site changes **one line** in `package.json`:

```json
"newsletter-site-theme": "github:HenrytheLobster/newsletter-site-template"
```

Then `npm install` and commit `package.json` + `package-lock.json`. After
that, a theme fix is: push this repo, `npm update newsletter-site-theme`
in the site, commit the lockfile.

Do **not** swap until that GitHub repo exists. The tarball is what makes
tonight’s Cloudflare builds possible.

## Drift guard

`scripts/no-theme-dupes.mjs` is on every build.

- Unit: a temp dir with `src/layouts/` fails; identical tarball contents
  fingerprint equal; a `file:../newsletter-site-template` spec fails
  (so does the pre-move `file:../../newsletter-site-template`); a stale
  vendor tarball fails when a template checkout is present; the package
  still contains every owned path (including `scripts/pack-theme.sh`).
  Resolution finds `../newsletter-site-template` (new layout) and
  `../../newsletter-site-template` (old layout), and returns null when
  neither exists.
- Site: fails if a theme consumer still has layouts, components, styles,
  lib, pages, `designs.js`, `markets.js`, or the old verification /
  `sync-theme.sh` scripts. `content.config.ts` must re-export from the
  package; `astro.config.mjs` must not carry the markdown plugin.
- Tarball: a converted site must depend on
  `file:./vendor/newsletter-site-theme-<version>.tgz`, the file must
  exist, and (when this template checkout is visible) its extracted
  contents must match a fresh `npm pack` of the template. A stale
  tarball is the new drift. Three situations, three messages:
  - template present and matching → `PASS (no vendored theme source)` plus
    `tarball matches template`
  - template present and stale → `FAIL` (stale tarball hit)
  - template absent (Cloudflare) → `PASS (no vendored theme source)` plus
    `SKIP stale-tarball compare (no template checkout — expected on Cloudflare)`
    — never a PASS that reads as compared-and-matched. The tarball still
    has to exist and be the dep. A later `github:HenrytheLobster/...`
    spec is accepted and skips the tarball check.

## Verification (the way Cloudflare will)

Each site, from a clean tree: `rm -rf node_modules dist && npm ci && npm run build`.

Worker names were **not** changed.

### Newport (`newportnewsletter-site`)

| Check | Result |
|---|---|
| `npm ci && npm run build` | PASS |
| URL parity | 46 before, 50 after, **0 missing** (extras: hashed CSS, `/_redirects`, `/guides` index, `/guides/best-movie-theaters-near-newport-news`) |
| `dist/_redirects` | **identical** to `public/_redirects`. **15 rules**: 8 `/seo/` + 7 `/lead-magnets/` |
| Issue files | 11 dated `/issues/2026-*.html` + `latest.html` + archive `index.html` (**13** html). `latest.html` is a file |
| Sitemap | extensionless `/issues/<date>` and `/issues/latest` — no `.html` in the sitemap |
| Kit uid | `78016a6dfc` on home and subscribe |
| GA | `G-NBCD5YGRCN` on home and subscribe |
| wrangler `name` | `newport-newsletter` (untouched) |
| `assets.directory` | `./dist` |
| Foreign identity | none (bleed PASS) |
| Drift | no theme source; tarball matches template |
| `dist/` | gitignored |
| Theme dep | `file:./vendor/newsletter-site-theme-1.0.0.tgz` |

### Alexandria (`novathisweek-site`)

Backfilled 15 guide markdown files from
`newsletter-platform/markets/alexandria/content/*.md`.
`fireworks-dc.html` and the gated guide tree stay as pass-through.

| Check | Result |
|---|---|
| `npm ci && npm run build` | PASS |
| URL parity | 63 before, 66 after, **0 missing** (extras: hashed CSS, `/_redirects`, `/guides` index) |
| `dist/_redirects` | **identical** to `public/_redirects`. **2 rules**: `/fireworks` and `/fireworks-guide` → `/fireworks-dc` |
| Issue files | 7 dated `/issues/2026-*.html` + `latest.html` + archive `index.html` (**9** html). `latest.html` is a file |
| Sitemap | extensionless `/issues/<date>` and `/issues/latest` — no `.html` in the sitemap |
| Kit uid | `db34c1d3c0` on home and subscribe |
| GA | `G-C6WBNNZ060` on home and subscribe |
| wrangler `name` | `novathisweek` (untouched — this is the name that must stay; a wrong name failed every alexandria build on 2026-08-21) |
| `assets.directory` | `./dist` (was `"."`) |
| Foreign identity | none (bleed PASS) |
| Drift | no theme source; tarball matches template |
| `dist/` | gitignored |
| Theme dep | `file:./vendor/newsletter-site-theme-1.0.0.tgz` |

### Wasatch (`stufftodoinutah-site`)

Backfilled 10 guide markdown files from
`newsletter-platform/markets/wasatch/content/*.md`.
The three legacy hike / trail / springs pages under `guides/` stay
pass-through HTML. This market has no `_redirects` today.

| Check | Result |
|---|---|
| `npm ci && npm run build` | PASS |
| URL parity | 47 before, 49 after, **0 missing** (extras: hashed CSS, `/guides` index) |
| `dist/_redirects` | none (live repo has none; copy-cf logs “ok”) |
| Issue files | 4 dated `/issues/2026-*.html` + `latest.html` + archive `index.html` (**6** html). `latest.html` is a file |
| Sitemap | extensionless `/issues/<date>` and `/issues/latest` — no `.html` in the sitemap |
| Kit uid | `a2c36795e2` on home and subscribe |
| GA | `G-ERME16NKE0` on home and subscribe |
| wrangler `name` | `wasatch-newsletter` (untouched) |
| `assets.directory` | `./dist` (was `"."`) |
| Foreign identity | none (bleed PASS) |
| Drift | no theme source; tarball matches template |
| `dist/` | gitignored |
| Theme dep | `file:./vendor/newsletter-site-theme-1.0.0.tgz` |

### Template preview (`newsletter-site-template`)

Parity walks the live site checkout with `SKIP_NAMES` covering the Astro
app tree (`src/`, `dist/`, `public/`, `scripts/`, `vendor/`, …), so a
converted site is compared against real site content, not 197 files of
build scaffolding. `npm run build:designs` (3 markets × 3 designs): all
nine PASS. Per market, 0 missing:

| Market | before | after | missing | extra |
|---|---|---|---|---|
| alexandria | 63 | 66 | 0 | hashed CSS, `/_redirects`, `/guides` index |
| newport | 46 | 49 | 0 | hashed CSS, `/_redirects`, `/guides` index |
| wasatch | 47 | 49 | 0 | hashed CSS, `/guides` index |

A Newport site build has one more extra (`/guides/best-movie-theaters-near-newport-news`) because that markdown lives in the site repo, not in the platform content dir the template copies.

## What the owner must do in the Cloudflare dashboard

Do **not** recreate any project. Do **not** rename any Worker. Do **not**
add a Worker `main` script. Change the **existing** Workers Builds
project for each site, then push that site.

Same settings for all three:

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build` |
| Deploy command | leave default `npx wrangler deploy` |
| Root directory | empty / `.` |
| Node | 22 (`.nvmrc`; or build variable `NODE_VERSION=22`) |

Per project — Worker name in the dashboard must already match
`wrangler.jsonc` (it does; do not change it):

| Site repo | Worker `name` (do not change) | `assets.directory` in repo |
|---|---|---|
| `novathisweek-site` | `novathisweek` | `./dist` |
| `newportnewsletter-site` | `newport-newsletter` | `./dist` |
| `stufftodoinutah-site` | `wasatch-newsletter` | `./dist` |

Alexandria and Wasatch currently deploy the repo root as static files
with **no** build step. If those repos are pushed before the dashboard
build command is set, wrangler will look for `./dist` and the live
site will break. Set the dashboard first, then push.

Newport is the same: do not push until the dashboard build command is
`npm ci && npm run build` and Node is 22. The tarball is in the repo,
so Cloudflare `npm ci` will work once that is set.

Suggested push order after the dashboard is updated: Newport, then
Alexandria, then Wasatch — so a surprise is one market, not three.

## Exact one-line change later (git dependency)

In each site’s `package.json`, replace:

```json
"newsletter-site-theme": "file:./vendor/newsletter-site-theme-1.0.0.tgz"
```

with:

```json
"newsletter-site-theme": "github:HenrytheLobster/newsletter-site-template"
```

Then `npm install`, commit `package.json` + `package-lock.json`, and
(optional) delete `vendor/*.tgz`. Only after
`github.com/HenrytheLobster/newsletter-site-template` exists and is public.
