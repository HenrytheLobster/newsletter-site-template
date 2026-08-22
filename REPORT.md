# Issue pages in the site shell

Extends the template. Writes only in `/Volumes/SSD/Projects/newsletter-site-template`.
No git push. Live site repos, platform, schedule-tool, social-poster, and the
old forks were not written to.

Built 2026-08-22. Design C remains the default. A and B still build and share
the same issue treatment.

## What counts as "the content"

Read several real files before deciding:

- `newsletter-sites/novathisweek-site/issues/latest.html` and dated files
- the same paths in newport and wasatch
- an older dated file (`2026-06-20.html`) that still has GA in `<head>`
- `issues/index.html` (the archive listing, not an email)
- the platform writer: `newsletter-platform/src/newsletter_engine/email_render.py`
  (`wrap_newsletter_html`) and `publish.py` (writes that body to
  `issues/<date>.html` and `issues/latest.html`)

**Dated issues and `latest.html` are complete email documents.** The publish
job writes the same HTML the email uses: `<html>`, `<head>` (title, sometimes
GA and Open Graph), `<body>` with inline styles, a hidden preheader `div`,
then a table canvas (navy subject banner, cards, subscribe pill, tiny footer).
There is no inner "content" wrapper the job reliably emits — no
`.issue-body`, no `#content`. The inner HTML of `<body>` *is* the issue.

So the extractor takes:

1. `<body>` innerHTML
2. minus `<script>` (old issues embed gtag in `<head>`; those must not ride
   into the site page)
3. minus `<style>` (pulled out and scoped — see below)
4. minus the hidden preheader (`mso-hide:all` / `display:none` + `max-height:0`)
5. the body's inline `style` copied onto the wrapper so the ivory canvas
   survives without a second `<body>`

The navy banner, cards, and email footer stay. That is what the reader
already knows as the issue, sitting under the site header.

**`issues/index.html` is not an email.** It is a listing with its own `.nav`
and unscoped `body`/`h1` CSS. Dropping that document into the site layout
would double the nav and leak CSS. The archive page is rendered from
`issues/manifest.json` (the same list publish already maintains) through the
design C (or A/B) layout.

## Issue CSS, and how it cannot leak

Current dated/`latest` files have **no `<style>` blocks** — all presentation
is inline. Only the old archive `index.html` has a `<style>`. Future issues
might grow a stylesheet, so every extracted `<style>` is still scoped.

`src/lib/scope-css.js` prefixes every selector with
`html body .issue-body.issue-body`. `html` / `body` / `:root` become that
host. `@media` / `@supports` inner rules are scoped; `@font-face` /
`@keyframes` stay as-is (they have no element selectors).

That prefix beats `body.d-c h1` and `body.d-c a` from the design sheets.
`src/styles/issues.css` then `all: revert`s site element rules inside
`.issue-body` so the email's inline styles own the look.

Proof is in `scripts/test-issues.mjs`:

- A fixture sheet `body { background: red } .masthead, footer { display: none }`
  becomes only host-prefixed selectors. `cssLeaksFromIssue()` fails the build
  if any remaining selector does not contain `.issue-body`.
- The same fixture run through `extractIssueDocument` keeps "Slightly
  different markup", drops `<script>` / `<html>` / `<head>` / `<body>`, and
  emits leak-free CSS.
- Dist pages: one `<html>`, one `<head>`, one `<body>`, one gtag snippet.

## How a brand-new issue file flows through

The platform `publish` job still writes `issues/<date>.html`, rewrites
`latest.html` / `index.html` / `manifest.json` in the site repo. This
template does not run that job.

On the next template build:

1. `prepare-market` copies every `issues/*.html` except `index.html` into
   `src/generated/issues/` (not `public/`, so Astro does not emit a second
   document). `manifest.json` still goes to `public/issues/`.
2. `src/pages/issues/[name].html.astro` `getStaticPaths` lists whatever is
   in that generated dir. A file it has never seen becomes a page with no
   code change.
3. After `astro build`, `flatten-issue-pages.mjs` turns
   `issues/latest.html/index.html` into the file `issues/latest.html` so the
   indexed URL shape is unchanged.
4. If the markup is slightly different (no `<body>`, extra wrapper, a
   `<style>`, missing title), the extractor degrades to readable markup
   instead of throwing.

## Awkward markup

- Email tables with nested `<div>` cards and **invalid** `<p>…<ul>…</ul></p>`.
  Left alone; cleaning it would restyle the issue.
- Hidden preheader padded with `&zwnj;` for inbox preview. Stripped from the
  body; the text is used as the meta description when the file has no
  `<meta name="description">`, with the zwnj padding removed.
- Older dated files include GA in `<head>` plus Open Graph. Scripts are
  dropped so the site layout's tag is the only one. Title / description are
  reused.
- `issues/index.html` ships its own nav and `body { … }` CSS. Not used as
  a document; the manifest is the source of truth for the archive list.
- Astro `build.format: "directory"` would have turned `/issues/latest.html`
  into a directory. Flattening is required to keep the file URL. The route
  file cannot be named `[file].html.astro` — Astro's `$$file` collides;
  it is `[name].html.astro`.

## Tests (green)

`npm run build` now ends with `scripts/test-issues.mjs` as well as parity,
bleed, and no-placeholder.

| | alexandria | newport | wasatch |
|---|---|---|---|
| DESIGN=c (default) | shell + content + no dupes + no CSS leak + file URLs; parity 0 missing; bleed pass; placeholder pass | same | same |
| DESIGN=a, DESIGN=b | same issue treatment, still building | same | same |

Indexed paths still exist as files: `/issues/`, `/issues/latest.html`,
`/issues/<date>.html`. Guide "You may also like" and JSON-LD are untouched.
Headline remains `src/config/markets.js` → `home.headline`.
