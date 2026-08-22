/**
 * Pull the newsletter out of a complete email HTML document so it can sit
 * inside the site layout. Never throws: a weird file degrades to readable
 * markup rather than breaking the build.
 *
 * What counts as "the content": the inner HTML of `<body>`, minus scripts,
 * style tags (those are extracted and scoped), and the hidden email
 * preheader. That is the table canvas the publish job writes — subject
 * banner, cards, subscribe pill, tiny footer — which is what the reader
 * already knows as the issue.
 */

import { scopeCss } from "./scope-css.js";

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&zwnj;|&zwj;/gi, "")
    .replace(/\u200c|\u200d/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

export function stripTags(html) {
  return decodeEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function stripScripts(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "");
}

function extractAttr(openTag, name) {
  const match = String(openTag || "").match(
    new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i")
  );
  return match ? match[2] ?? match[3] ?? "" : "";
}

function extractTitle(html) {
  const match = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : "";
}

function extractMetaDescription(html) {
  const match = String(html || "").match(
    /<meta\b[^>]*name=["']description["'][^>]*>/i
  );
  if (!match) {
    const rev = String(html || "").match(
      /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
    );
    return rev ? decodeEntities(rev[1]).trim() : "";
  }
  return decodeEntities(extractAttr(match[0], "content")).trim();
}

function extractStyleBlocks(html) {
  const blocks = [];
  const rest = String(html || "").replace(
    /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
    (_, css) => {
      blocks.push(css);
      return "";
    }
  );
  return { css: blocks.join("\n"), html: rest };
}

function extractPreheader(html) {
  let text = "";
  const rest = String(html || "").replace(
    /<div\b[^>]*>[\s\S]*?<\/div>/gi,
    (block) => {
      const open = block.match(/^<div\b[^>]*>/i)?.[0] || "";
      const style = extractAttr(open, "style");
      const isPreheader =
        /mso-hide:\s*all/i.test(style) ||
        (/display:\s*none/i.test(style) && /max-height:\s*0/i.test(style));
      if (!isPreheader) return block;
      if (!text) text = stripTags(block.replace(/\u200c/g, "")).trim();
      return "";
    }
  );
  return { text, html: rest };
}

function stripDocumentChrome(html) {
  return String(html || "")
    .replace(/^\uFEFF/, "")
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?html\b[^>]*>/gi, "")
    .replace(/<\/?body\b[^>]*>/gi, "")
    .replace(/<\/?head\b[^>]*>/gi, "")
    .trim();
}

function fallbackTitle(content, filename) {
  const h1 = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = stripTags(h1[1]);
    if (text) return text;
  }
  if (filename && filename !== "latest.html") {
    return filename.replace(/\.html$/i, "");
  }
  return "Issue";
}

function emptyResult(filename) {
  return {
    title: fallbackTitle("", filename),
    description: "",
    bodyStyle: "",
    bodyClass: "",
    scopedCss: "",
    content: "<p>This issue could not be read.</p>",
    degraded: true,
  };
}

/**
 * @param {string} html
 * @param {{ filename?: string }} [opts]
 */
export function extractIssueDocument(html, opts = {}) {
  const filename = opts.filename || "";
  const raw = String(html || "");
  if (!raw.trim()) return emptyResult(filename);

  try {
    const titleFromHead = extractTitle(raw);
    const metaDescription = extractMetaDescription(raw);
    const styles = extractStyleBlocks(raw);
    const withoutScripts = stripScripts(styles.html);

    const bodyMatch = withoutScripts.match(
      /<body\b([^>]*)>([\s\S]*?)<\/body>/i
    );
    let bodyStyle = "";
    let bodyClass = "";
    let inner = "";
    if (bodyMatch) {
      bodyStyle = extractAttr(bodyMatch[1], "style");
      bodyClass = extractAttr(bodyMatch[1], "class");
      inner = bodyMatch[2];
    } else {
      inner = stripDocumentChrome(withoutScripts);
    }

    inner = stripScripts(inner);
    const stylesInBody = extractStyleBlocks(inner);
    inner = stylesInBody.html;
    const allCss = [styles.css, stylesInBody.css].filter(Boolean).join("\n");

    const pre = extractPreheader(inner);
    inner = pre.html;
    inner = stripDocumentChrome(inner);

    if (!inner.trim()) {
      const fallback = stripTags(raw);
      inner = fallback
        ? `<p>${escapeText(fallback.slice(0, 4000))}</p>`
        : "<p>This issue could not be read.</p>";
    }

    const title = titleFromHead || fallbackTitle(inner, filename);
    const description = metaDescription || pre.text || "";

    return {
      title,
      description,
      bodyStyle,
      bodyClass,
      scopedCss: scopeCss(allCss),
      content: inner.trim(),
      degraded: !bodyMatch,
    };
  } catch {
    const text = stripTags(raw).slice(0, 4000);
    return {
      title: fallbackTitle("", filename),
      description: "",
      bodyStyle: "",
      bodyClass: "",
      scopedCss: "",
      content: text
        ? `<p>${escapeText(text)}</p>`
        : "<p>This issue could not be read.</p>",
      degraded: true,
    };
  }
}

function escapeText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function issueBodyClass(bodyClass) {
  const extra = String(bodyClass || "")
    .split(/\s+/)
    .filter((cls) => cls && cls !== "issue-body")
    .join(" ");
  return extra ? `issue-body ${extra}` : "issue-body";
}
