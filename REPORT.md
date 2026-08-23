# Shared theme package

Built 2026-08-22. Writes in `newsletter-site-template` and
`newsletter-sites/newportnewsletter-site` only. No git push. No
`gh repo create`. No Cloudflare / wrangler deploy / Kit / Sheets.

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
`astro.config.mjs`, and a one-line `src/content.config.ts` re-export
(Astro only loads that file from the project).

Ambiguous things went in the package. The catalog at
`src/config/markets.js` stays here so template preview can still build all
three markets and so `bleed.mjs` knows every foreign name/domain/GA/Kit
token. A converted site’s `src/config/market.js` wins for that market
(prepare overlays it). `siteRepo` / `contentDir` stay in the catalog —
those paths are the owner’s machine, and Cloudflare never sees them.

Why this cut: a sitemap fix is one commit in the package. A headline
change is one commit in the site. Nothing in the middle is copied.

## Distribution

Chosen: **public GitHub repo, npm git URL.**

| Option | Cloudflare `npm ci` | Every theme fix | Tradeoff |
|---|---|---|---|
| **Public GitHub + `github:HenrytheLobster/newsletter-site-template`** | clones, no auth | push this repo; in the site `npm update newsletter-site-theme` and commit the lockfile | theme source is public. Kit/GA ids already are, in the live HTML |
| Private repo + build token | needs `GITHUB_TOKEN` + `.npmrc` | same, plus token rotation | more moving parts for a theme that is not secret |
| npmjs | registry fetch | `npm publish` then bump | extra account and a publish step we do not need |

Until that repo exists, Newport is committed with

```
"newsletter-site-theme": "file:../../newsletter-site-template"
```

so `npm ci && npm run build` works from a clean checkout **on this
machine**. That path does not exist in the Cloudflare container. **Do
not push Newport until the GitHub repo is up and the dep is swapped**,
or the live build will fail.

### Commands the owner must run

`gh repo create` is blocked for agents. Suggested name matches this
folder. Package name inside it is already `newsletter-site-theme`.

```bash
# 1. Create the public repo and push the package
cd /Volumes/SSD/Projects/newsletter-site-template
git remote add origin git@github.com:HenrytheLobster/newsletter-site-template.git
# then in the GitHub UI, or:
#   gh repo create HenrytheLobster/newsletter-site-template --public --source=. --remote=origin
git push -u origin main

# 2. Point Newport at the git URL (before any Cloudflare-facing push)
cd /Volumes/SSD/Projects/newsletter-sites/newportnewsletter-site
npm install github:HenrytheLobster/newsletter-site-template
npm run build
# commit package.json + package-lock.json; owner pushes

# 3. A later theme fix
cd /Volumes/SSD/Projects/newsletter-site-template
# commit; owner pushes
cd /Volumes/SSD/Projects/newsletter-sites/newportnewsletter-site
npm update newsletter-site-theme
npm run build
# commit the lockfile; owner pushes
```

The lockfile pins the commit. Cloudflare `npm ci` then clones the public
repo with no interactive auth.

## Drift guard

`scripts/no-theme-dupes.mjs` is on every build.

- Unit: a temp dir with `src/layouts/` fails; the package still contains
  every owned path.
- Site: fails if a theme consumer still has layouts, components, styles,
  lib, pages, `designs.js`, `markets.js`, or the old verification /
  `sync-theme.sh` scripts. `content.config.ts` must re-export from the
  package; `astro.config.mjs` must not carry the markdown plugin.

Unconverted static repos (Alexandria, Wasatch) are skipped.

## Parity fix

The template used to walk the whole Newport checkout, so after the Astro
app was vendored it compared against 197 files (and copied that tree into
`public/` / `dist/`). `SKIP_NAMES` now skips `src/`, `dist/`, `public/`,
`scripts/`, and the other app files. Template `MARKET=newport` is **46
before, 0 missing** — real site content only. `_redirects` is found in
`public/` as well as the repo root, so the 301 file is no longer dropped.

## Newport verification

From a clean `npm ci && npm run build` in `newportnewsletter-site`:

| Check | Result |
|---|---|
| `npm ci && npm run build` | PASS |
| URL parity | 46 before, 49 after, **0 missing** (extras: hashed CSS, `/_redirects`, `/guides` index) |
| `dist/_redirects` | **identical** to `public/_redirects`. 8 `/seo/` 301s, 7 `/lead-magnets/` 301s |
| Issue files | 11 dated `/issues/2026-*.html` + `latest.html` + archive `index.html` (13 html files). `latest.html` is a file, not a directory |
| Sitemap | extensionless `/issues/<date>` and `/issues/latest` — no `.html` in the sitemap (commit `db0a179`) |
| Kit uid | `78016a6dfc` on home and subscribe |
| GA | `G-NBCD5YGRCN` on home and subscribe |
| wrangler `name` | `newport-newsletter` (untouched) |
| Foreign identity | none (bleed PASS) |
| `dist/` | gitignored |

Template preview of Newport still works: DESIGN=a, b, and c all PASS.
Alexandria-c and wasatch-c PASS. Designs A/B/C share the same issue
treatment.

## What Alexandria and Wasatch each need

Do not convert them until the GitHub repo exists, or they will hit the
same `file:` Cloudflare hole. When they follow, each needs:

1. **`src/config/market.js`** — copy that market’s object out of this
   package’s catalog. Drop `siteRepo` / `contentDir`. Keep Kit, GA,
   colours, nav, headline, featured, lead magnets. Default `MARKET` to
   that id and `DESIGN` to `c` so Cloudflare needs no extra env.
2. **Guide markdown** at `src/content/guides/*.md`, backfilled from
   `newsletter-platform/markets/<id>/content/*.md` (15 Alexandria, 10
   Wasatch). The platform will keep writing there, same as Newport.
3. **Thin Astro entry** — `astro.config.mjs` with
   `newsletterTheme()`, `outDir: "dist"`, `site` from the market domain.
   One-line `src/content.config.ts` re-export. `package.json` scripts
   calling `newsletter-theme build`, dependency on the theme (git URL
   once the repo exists).
4. **Keep the content the platform already writes** — `issues/`, legacy
   `guides/`, `images/`. Alexandria’s `_redirects` is at the repo root
   today; move it to `public/_redirects` (or leave it at root — prepare
   and copy-cf look in both places). Wasatch has no `_redirects`.
5. **`wrangler.jsonc`** — do **not** rename the Worker.
   Alexandria is `novathisweek`. Wasatch is `wasatch-newsletter`.
   Change `assets.directory` from `"."` to `"./dist"`. Gitignore `dist/`.
6. **Cloudflare dashboard** (owner): build command `npm ci && npm run build`,
   Node 22, root directory `.`. Do not add a Worker `main`. Do not
   recreate the project.
7. **Prove it** with the same checks Newport just passed: clean
   `npm ci && npm run build`, 0 missing URLs, no foreign identity, issue
   `.html` files flattened, sitemap extensionless, Kit/GA present,
   `no-theme-dupes` PASS.

Alexandria extras: `fireworks-dc.html` and the gated guide tree under
`guides/` and `images/` must keep their URLs. Wasatch extras: the three
legacy hike/trail/springs guides under `guides/` are pass-through, not
markdown.

After each conversion, a theme fix is: push this package, `npm update`
in that site, commit the lockfile.
