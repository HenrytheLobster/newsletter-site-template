/**
 * Prefix email/issue CSS so it cannot restyle the site shell.
 *
 * Host is `.issue-body.issue-body` (double class matches `class="issue-body"`
 * once) under `html body`, which beats `body.d-* h1` / `body.d-* a` from the
 * design stylesheets. `html` / `body` / `:root` become the host itself.
 */

export const ISSUE_SCOPE = ".issue-body";
export const ISSUE_HOST = "html body .issue-body.issue-body";

function stripComments(css) {
  return String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractBlock(css, openBrace) {
  let depth = 0;
  for (let i = openBrace; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          block: css.slice(openBrace + 1, i),
          end: i + 1,
        };
      }
    }
  }
  return { block: css.slice(openBrace + 1), end: css.length };
}

function replaceTypeSelector(selector, tag, replacement) {
  const re = new RegExp(
    `(^|[\\s>+~,(])${tag}(?=[\\s>+~.#:\\[,]|$)`,
    "gi"
  );
  return selector.replace(re, `$1${replacement}`);
}

export function scopeSelector(selector, host = ISSUE_HOST) {
  const raw = String(selector || "").trim();
  if (!raw) return raw;

  if (/^(?:html|body|:root|:host)$/i.test(raw)) return host;

  let out = raw;
  out = out.replace(/:root|:host/gi, host);
  out = replaceTypeSelector(out, "html", host);
  out = replaceTypeSelector(out, "body", host);

  if (!out.includes(ISSUE_SCOPE)) {
    out = `${host} ${out}`;
  } else if (!out.startsWith(host) && !out.startsWith(ISSUE_SCOPE)) {
    out = `${host} ${out}`;
  }
  return out.replace(/\s+/g, " ").trim();
}

function scopeRuleList(css, host) {
  let out = "";
  let i = 0;
  const text = String(css || "");
  while (i < text.length) {
    const nextBrace = text.indexOf("{", i);
    if (nextBrace === -1) {
      out += text.slice(i);
      break;
    }
    const prelude = text.slice(i, nextBrace).trim();
    const { block, end } = extractBlock(text, nextBrace);

    if (!prelude) {
      i = end;
      continue;
    }

    if (prelude.startsWith("@")) {
      if (/^@(media|supports|layer|container|document|scope)\b/i.test(prelude)) {
        out += `${prelude}{${scopeRuleList(block, host)}}`;
      } else {
        out += `${prelude}{${block}}`;
      }
    } else {
      const scoped = prelude
        .split(",")
        .map((part) => scopeSelector(part, host))
        .filter(Boolean)
        .join(",");
      out += `${scoped}{${block}}`;
    }
    i = end;
  }
  return out;
}

export function scopeCss(css, host = ISSUE_HOST) {
  return scopeRuleList(stripComments(css), host).trim();
}

/** True when a stylesheet could match nodes outside `.issue-body`. */
export function cssLeaksFromIssue(css) {
  const text = stripComments(css);
  if (!text.trim()) return false;

  let i = 0;
  while (i < text.length) {
    const nextBrace = text.indexOf("{", i);
    if (nextBrace === -1) break;
    const prelude = text.slice(i, nextBrace).trim();
    const { end } = extractBlock(text, nextBrace);

    if (prelude.startsWith("@")) {
      if (/^@(media|supports|layer|container|document|scope)\b/i.test(prelude)) {
        const inner = extractBlock(text, nextBrace).block;
        if (cssLeaksFromIssue(inner)) return true;
      }
      i = end;
      continue;
    }

    const selectors = prelude.split(",").map((s) => s.trim()).filter(Boolean);
    for (const selector of selectors) {
      if (!selector.includes(ISSUE_SCOPE)) return true;
    }
    i = end;
  }
  return false;
}
