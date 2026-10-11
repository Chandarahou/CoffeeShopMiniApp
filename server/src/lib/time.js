import { config } from '../config.js';

/** Start (inclusive) and end (exclusive) of "today" in the shop's timezone, as UTC Dates. */
export function shopDayRange(date = new Date()) {
  const offsetMs = config.shopUtcOffsetMinutes * 60_000;
  const local = new Date(date.getTime() + offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const start = new Date(startLocal - offsetMs);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000) };
}
