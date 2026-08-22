/**
 * Guide markdown repeats title (# h1) and intro as the first paragraph.
 * The layout already prints those from frontmatter, so drop the duplicates.
 */
function nodeText(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!node.children) return "";
  return node.children.map(nodeText).join("");
}

function norm(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripLeadMatter() {
  return function (tree, file) {
    const fm = file.data?.astro?.frontmatter || {};
    let changed = true;
    while (changed && tree.children.length) {
      changed = false;
      const first = tree.children[0];
      if (first.type === "heading" && first.depth === 1) {
        tree.children.shift();
        changed = true;
        continue;
      }
      if (first.type === "paragraph" && fm.intro) {
        if (norm(nodeText(first)) === norm(fm.intro)) {
          tree.children.shift();
          changed = true;
        }
      }
    }
  };
}
