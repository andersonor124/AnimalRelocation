// Small, timezone-safe date helpers. All dates are ISO "YYYY-MM-DD" strings
// handled as UTC midnight so daylight-saving changes never shift a day.

const DAY = 86_400_000;

export function parseISO(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid date: ${iso}`);
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(t) || toISO(t) !== iso) throw new Error(`Invalid date: ${iso}`);
  return t;
}

export function toISO(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(parseISO(iso) + days * DAY);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b) - parseISO(a)) / DAY);
}

export function todayISO(now: Date = new Date()): string {
  return toISO(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function isValidISO(iso: unknown): iso is string {
  if (typeof iso !== 'string') return false;
  try {
    parseISO(iso);
    return true;
  } catch {
    return false;
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "12 Jun 2027" — unambiguous for readers in any country. */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
