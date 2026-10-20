import { config } from '../config.js';

/** Start (inclusive) and end (exclusive) of "today" in the shop's timezone, as UTC Dates. */
/** Today's date in the shop's timezone, as YYYY-MM-DD. */
export function shopDateString(date = new Date()) {
  const offsetMs = config.shopUtcOffsetMinutes * 60_000;
  const local = new Date(date.getTime() + offsetMs);
  return local.toISOString().slice(0, 10);
}

export function shopDayRange(date = new Date()) {
  const offsetMs = config.shopUtcOffsetMinutes * 60_000;
  const local = new Date(date.getTime() + offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const start = new Date(startLocal - offsetMs);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000) };
}
