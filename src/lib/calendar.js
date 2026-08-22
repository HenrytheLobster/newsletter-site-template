/**
 * Month grid from real ISO dates. Empty cells stay empty — no placeholder events.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseIsoDate(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day, iso: `${m[1]}-${m[2]}-${m[3]}` };
}

export function displayDate(iso) {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  return `${MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

export function monthName(month) {
  return MONTHS[month - 1] || "";
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {Record<string, { href?: string, label?: string, kind?: string }>} marks keyed by YYYY-MM-DD
 */
export function buildMonthGrid(year, month, marks = {}) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ empty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const mark = marks[iso] || null;
    cells.push({
      empty: false,
      day,
      iso,
      marked: Boolean(mark),
      href: mark?.href || null,
      label: mark?.label || null,
      kind: mark?.kind || null,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ empty: true });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    year,
    month,
    title: `${monthName(month)} ${year}`,
    weekdays: WEEKDAYS,
    weeks,
  };
}

export function marksFromItems(items, { href, kind } = {}) {
  const marks = {};
  for (const item of items || []) {
    const parsed = parseIsoDate(item.date);
    if (!parsed) continue;
    if (!marks[parsed.iso]) {
      marks[parsed.iso] = {
        href: item.href || href || null,
        label: item.title || item.label || parsed.iso,
        kind: item.kind || kind || "item",
      };
    }
  }
  return marks;
}
