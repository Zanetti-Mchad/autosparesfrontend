/**
 * Display dates as "03rd August 2026"
 */

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

export function ordinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export function formatDisplayDate(
  input: string | Date | number | null | undefined,
  fallback = "—"
): string {
  if (input === null || input === undefined || input === "") return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;

  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${String(day).padStart(2, "0")}${ordinalSuffix(day)} ${month} ${year}`;
}

/** Date + time, e.g. "03rd August 2026, 14:30" */
export function formatDisplayDateTime(
  input: string | Date | number | null | undefined,
  fallback = "—"
): string {
  if (input === null || input === undefined || input === "") return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDisplayDate(d)}, ${hh}:${mm}`;
}

/** True if value looks like an ISO / parseable date string (not a plain number/code). */
export function looksLikeDateValue(val: unknown): boolean {
  if (val instanceof Date) return !Number.isNaN(val.getTime());
  if (typeof val !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(val) && !/^\d{4}\/\d{2}\/\d{2}/.test(val)) {
    // also allow locale-ish strings that Date can parse with T or GMT
    if (!val.includes("T") && !val.includes("GMT") && !val.includes("UTC")) return false;
  }
  const d = new Date(val);
  return !Number.isNaN(d.getTime());
}

/** YYYY-MM-DD in local time */
export function toDateInputValue(input?: string | Date | number | null): string {
  if (input === null || input === undefined || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toDateInputValue(new Date());
}

export function monthStartISO(): string {
  const d = new Date();
  return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Inclusive From/To on calendar days. Empty bound = open. Missing value fails closed when either bound set. */
export function isDateInRange(
  value: string | Date | number | null | undefined,
  fromDate?: string,
  toDate?: string
): boolean {
  if (!fromDate && !toDate) return true;
  if (value === null || value === undefined || value === "") return false;
  const day = toDateInputValue(value);
  if (!day) return false;
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}
