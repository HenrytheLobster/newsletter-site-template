#!/usr/bin/env node
/**
 * Issue pages must ship inside the site shell, keep the email's own
 * content, keep indexed `.html` URLs, and not leak email CSS into the
 * header/footer. Unit tests cover the extractor; dist tests cover a build.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getMarket } from "../src/lib/market.js";
import { getDesignId } from "../src/config/designs.js";
import { distDir, generatedDir } from "./paths.mjs";
import {
  cssLeaksFromIssue,
  ISSUE_SCOPE,
  scopeCss,
  scopeSelector,
} from "../src/lib/scope-css.js";
import { extractIssueDocument } from "../src/lib/issue-html.js";
import { listIssueHtmlFiles, loadIssueManifest } from "../src/lib/issues.js";

const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.error(`  FAIL ${name}: ${err.message}`);
  }
}

function countOpenTags(html, tag) {
  const re = new RegExp(`<${tag}\\b`, "gi");
  return (String(html || "").match(re) || []).length;
}

const ODD_ISSUE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Oddball weekly</title>
    <style>
      body { background: rgb(255, 0, 0); color: white; }
      html, body, .masthead, footer, .site-footer { display: none !important; }
      h1 { color: magenta; }
      @media (max-width: 600px) {
        body { font-size: 14px; }
        .masthead { height: 0; }
      }
    </style>
    <script>window.LEAK = true;</script>
  </head>
  <body class="letter">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      Hidden preheader should not appear as a heading.
    </div>
    <main class="letter-body">
      <h1>Slightly different markup</h1>
      <p>No tables here, just a letter.</p>
    </main>
    <script>document.body.style.background = "red";</script>
  </body>
</html>`;

function unitTests() {
  console.log("[test-issues] unit");

  check("scopeSelector prefixes element selectors", () => {
    assert.equal(
      scopeSelector("h1"),
      "html body .issue-body.issue-body h1"
    );
  });

  check("scopeSelector maps body/html to the host", () => {
    assert.equal(scopeSelector("body"), "html body .issue-body.issue-body");
    assert.equal(scopeSelector("html"), "html body .issue-body.issue-body");
  });

  check("scopeCss cannot leak into the site shell", () => {
    const scoped = scopeCss(`
      body { background: rgb(255, 0, 0); }
      .masthead, footer, .site-footer { display: none !important; }
      h1 { color: magenta; }
      @media (max-width: 600px) {
        body { font-size: 14px; }
        .masthead { height: 0; }
      }
    `);
    assert.equal(cssLeaksFromIssue(scoped), false);
    assert.match(scoped, /html body \.issue-body\.issue-body\{/);
    assert.match(
      scoped,
      /html body \.issue-body\.issue-body \.masthead/
    );
    assert.doesNotMatch(scoped, /(?:^|[,{])\s*body\s*\{/);
    assert.doesNotMatch(scoped, /(?:^|[,{])\s*\.masthead\s*\{/);
    assert.ok(scoped.includes(ISSUE_SCOPE));
  });

  check("extractIssueDocument keeps body content, drops chrome", () => {
    const extracted = extractIssueDocument(ODD_ISSUE, {
      filename: "odd.html",
    });
    assert.equal(extracted.title, "Oddball weekly");
    assert.match(extracted.content, /Slightly different markup/);
    assert.match(extracted.content, /No tables here, just a letter/);
    assert.doesNotMatch(extracted.content, /<html\b/i);
    assert.doesNotMatch(extracted.content, /<head\b/i);
    assert.doesNotMatch(extracted.content, /<body\b/i);
    assert.doesNotMatch(extracted.content, /<script\b/i);
    assert.doesNotMatch(extracted.content, /window\.LEAK/);
    assert.doesNotMatch(extracted.content, /Hidden preheader/);
    assert.equal(cssLeaksFromIssue(extracted.scopedCss), false);
    assert.match(extracted.scopedCss, /\.issue-body/);
    assert.doesNotMatch(extracted.scopedCss, /(?:^|[,{])\s*\.masthead\s*\{/);
    assert.match(extracted.bodyClass, /letter/);
  });

  check("extractIssueDocument degrades on a fragment", () => {
    const extracted = extractIssueDocument(
      "<h2>Just a heading</h2><p>Loose fragment with no html wrapper.</p>",
      { filename: "2026-09-03.html" }
    );
    assert.match(extracted.content, /Just a heading/);
    assert.match(extracted.content, /Loose fragment/);
    assert.doesNotMatch(extracted.content, /<html\b/i);
    assert.ok(extracted.title);
  });

  check("extractIssueDocument degrades on empty/broken input", () => {
    const empty = extractIssueDocument("", { filename: "x.html" });
    assert.match(empty.content, /could not be read/);
    const broken = extractIssueDocument("<html><head><title>X</title>", {
      filename: "x.html",
    });
    assert.ok(broken.content.length > 0);
    assert.doesNotMatch(broken.content, /<script\b/i);
  });

  check("preheader zwnj padding does not become the description noise", () => {
    const extracted = extractIssueDocument(
      `<html><head><title>T</title></head><body>
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
          Plan your week with ramen.
          &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        </div>
        <p>Body copy.</p>
      </body></html>`
    );
    assert.equal(extracted.description, "Plan your week with ramen.");
    assert.doesNotMatch(extracted.description, /zwnj/);
    assert.doesNotMatch(extracted.content, /Plan your week with ramen/);
  });
}

function distTests() {
  const market = getMarket();
  const design = getDesignId();
  const dist = distDir(market, design);
  console.log(`[test-issues] dist ${market.id}/${design}`);

  check("indexed issue URLs exist as files", () => {
    const archive = path.join(dist, "issues", "index.html");
    const latest = path.join(dist, "issues", "latest.html");
    assert.ok(fs.existsSync(archive), "missing issues/index.html");
    assert.ok(fs.statSync(latest).isFile(), "latest.html must be a file, not a directory");
    assert.ok(
      !fs.existsSync(path.join(dist, "issues", "latest.html", "index.html")),
      "latest.html must not be a directory"
    );
    const manifest = loadIssueManifest();
    assert.ok(manifest.length > 0, "manifest is empty");
    for (const item of manifest) {
      const file = path.join(dist, "issues", item.file);
      assert.ok(fs.statSync(file).isFile(), `missing file ${item.file}`);
    }
  });

  const latestPath = path.join(dist, "issues", "latest.html");
  const latestHtml = fs.readFileSync(latestPath, "utf8");
  const sourceLatest = path.join(
    generatedDir(),
    "issues",
    "latest.html"
  );
  const source = fs.existsSync(sourceLatest)
    ? fs.readFileSync(sourceLatest, "utf8")
    : "";
  const extracted = extractIssueDocument(source, { filename: "latest.html" });

  check("latest issue sits in the site shell", () => {
    assert.match(latestHtml, /class="masthead"/);
    assert.match(latestHtml, /aria-label="Primary"/);
    assert.match(latestHtml, /class="site-footer"/);
    assert.match(latestHtml, /<header\b/i);
    assert.match(latestHtml, /<footer\b/i);
    assert.match(latestHtml, /class="issue-body"/);
    if (design === "c") {
      assert.match(latestHtml, /data-design="c"/);
      assert.match(latestHtml, /class="d-c"/);
    }
  });

  check("issue content survives", () => {
    const needle =
      extracted.title ||
      (loadIssueManifest()[0] && loadIssueManifest()[0].title);
    assert.ok(needle, "no title to assert");
    assert.ok(
      latestHtml.includes(needle) ||
        latestHtml.includes(needle.replace(/&/g, "&amp;")),
      `missing issue title ${JSON.stringify(needle)}`
    );
    const snippet = (extracted.content.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/i) ||
      extracted.content.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i) ||
      [])[0];
    if (snippet) {
      const text = snippet.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 8) {
        assert.ok(
          latestHtml.includes(text.split(" ").slice(0, 4).join(" ")) ||
            latestHtml.includes(text),
          `missing issue heading text ${JSON.stringify(text.slice(0, 80))}`
        );
      }
    }
  });

  check("no duplicate document chrome or analytics", () => {
    assert.equal(countOpenTags(latestHtml, "html"), 1);
    assert.equal(countOpenTags(latestHtml, "head"), 1);
    assert.equal(countOpenTags(latestHtml, "body"), 1);
    const gtag = latestHtml.match(/googletagmanager\.com\/gtag\/js/g) || [];
    assert.equal(gtag.length, 1, `gtag script count ${gtag.length}`);
    const configs = latestHtml.match(/gtag\(\s*["']config["']/g) || [];
    assert.equal(configs.length, 1, `gtag config count ${configs.length}`);
  });

  check("issue CSS in dist does not leak", () => {
    const styles = [...latestHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
      .map((m) => m[1])
      .filter((css) => css.includes(ISSUE_SCOPE) || css.includes("masthead") || /(?:^|[,{])\s*body\s*\{/.test(css));
    for (const css of styles) {
      if (!css.includes(ISSUE_SCOPE) && !/body\.d-/.test(css) && !css.includes(".issue-")) {
        continue;
      }
      if (css.includes(ISSUE_SCOPE)) {
        assert.equal(
          cssLeaksFromIssue(css),
          false,
          "scoped issue CSS still has unscoped selectors"
        );
      }
    }
    const issueArticle = latestHtml.match(
      /<article\b[^>]*class="[^"]*issue-body[^"]*"[\s\S]*?<\/article>/i
    );
    assert.ok(issueArticle, "missing issue-body article");
    const scoped = [...issueArticle[0].matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
    for (const m of scoped) {
      assert.equal(cssLeaksFromIssue(m[1]), false);
    }
  });

  check("every copied issue file renders", () => {
    const files = listIssueHtmlFiles();
    assert.ok(files.includes("latest.html"), "latest.html not in generated issues");
    for (const name of files) {
      const page = path.join(dist, "issues", name);
      assert.ok(fs.statSync(page).isFile(), `${name} missing in dist`);
      const html = fs.readFileSync(page, "utf8");
      assert.equal(countOpenTags(html, "html"), 1, `${name} html count`);
      assert.equal(countOpenTags(html, "body"), 1, `${name} body count`);
      assert.match(html, /class="masthead"/);
      assert.match(html, /class="issue-body"/);
    }
  });
}

function main() {
  unitTests();
  if (process.env.MARKET) {
    distTests();
  }
  if (failures.length) {
    console.error(`[test-issues] FAIL (${failures.length})`);
    process.exit(1);
  }
  console.log("[test-issues] PASS");
}

main();
