/**
 * Build-time homepage direction. Same content and URLs; different structure.
 *
 *   DESIGN=a|b|c
 *
 * Defaults to `c` (hybrid: owner palette + signup + issue calendar).
 */

export const DESIGNS = {
  a: {
    id: "a",
    name: "conversion-first",
    label: "A — conversion-first",
    wins: "Signup above the fold, one featured guide, tight lists, a dark lead-magnet promo.",
  },
  b: {
    id: "b",
    name: "local-magazine",
    label: "B — local magazine",
    wins: "Masthead, editorial rows with thumbnails, an issues/events calendar, denser browse.",
  },
  c: {
    id: "c",
    name: "hybrid",
    label: "C — hybrid",
    wins: "Owner palette and type, Hustle signup discipline, Scoop issue/event usefulness.",
  },
};

export const DESIGN_IDS = Object.keys(DESIGNS);

export function getDesignId() {
  const raw = process.env.DESIGN;
  const id = (raw || "c").toLowerCase();
  if (!DESIGNS[id]) {
    throw new Error(
      `Set DESIGN to one of: ${DESIGN_IDS.join(", ")}. Got ${JSON.stringify(raw)}.`
    );
  }
  return id;
}

export function getDesign(id = getDesignId()) {
  const resolved = DESIGNS[id];
  if (!resolved) {
    throw new Error(
      `Set DESIGN to one of: ${DESIGN_IDS.join(", ")}. Got ${JSON.stringify(id)}.`
    );
  }
  return resolved;
}
