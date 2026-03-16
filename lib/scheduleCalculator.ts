/**
 * Pure utility functions for computing medication dose schedules.
 * No React or Convex dependencies.
 */

/** Extract doses-per-day from a frequency string. Returns 0 for "as needed" / unrecognized. */
export function parseDosesPerDay(frequency: string): number {
  const freq = frequency.toLowerCase().trim();

  // "as needed", "prn", etc. → skip scheduling (check first to avoid false positives)
  if (/as\s*needed|prn|after\s*each|when\s*required|loose\s*stool/i.test(freq)) return 0;

  // Medical abbreviations: OD, BD/BID, TDS/TID, QID
  if (/\bod\b/.test(freq)) return 1;
  if (/\b(bd|bid)\b/.test(freq)) return 2;
  if (/\b(tds|tid)\b/.test(freq)) return 3;
  if (/\bqid\b/.test(freq)) return 4;

  // "X times daily/a day/per day" or "Xx daily"
  const timesMatch = freq.match(/(\d+)\s*(?:x|times?\s*(?:daily|a\s*day|per\s*day)?)/);
  if (timesMatch) {
    const n = Number(timesMatch[1]);
    if (n >= 1 && n <= 12) return n;
  }

  // "once", "twice", "thrice" — with or without "daily/a day"
  if (/\bonce\b/.test(freq)) return 1;
  if (/\btwice\b/.test(freq)) return 2;
  if (/\bthrice\b/.test(freq)) return 3;

  // "daily" / "every day" / "once daily" / "one time"
  if (/\b(daily|every\s*day|one\s*time)\b/.test(freq)) return 1;

  // "every X-Y hours" — use the higher interval (fewer doses)
  const rangeMatch = freq.match(/every\s*(\d+)\s*-\s*(\d+)\s*(?:hours?|hrs?)/);
  if (rangeMatch) return Math.floor(24 / Number(rangeMatch[2]));

  // "every X hours"
  const everyMatch = freq.match(/every\s*(\d+)\s*(?:hours?|hrs?)/);
  if (everyMatch) return Math.floor(24 / Number(everyMatch[1]));

  // "morning and evening" → 2, "morning, afternoon and evening" → 3
  if (/morning.*(afternoon|noon|midday).*evening/.test(freq)) return 3;
  if (/morning.*evening|evening.*morning/.test(freq)) return 2;

  return 0;
}

/**
 * Distribute doses evenly across a ~16-hour waking window starting at the given time.
 * Returns times as "HH:MM" strings, rounded to nearest 5 minutes. Caps at 23:59.
 */
export function computeDoseTimes(
  dosesPerDay: number,
  startHour: number,
  startMinute: number,
): string[] {
  if (dosesPerDay <= 0) return [];

  if (dosesPerDay === 1) {
    return [formatTimeHHMM(startHour, startMinute)];
  }

  const intervalMinutes = Math.floor((16 * 60) / dosesPerDay);
  const startTotalMinutes = startHour * 60 + startMinute;
  const times: string[] = [];

  for (let i = 0; i < dosesPerDay; i++) {
    let totalMin = startTotalMinutes + i * intervalMinutes;
    // Round to nearest 5 minutes
    totalMin = Math.round(totalMin / 5) * 5;
    // Cap at 23:59
    if (totalMin >= 24 * 60) break;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    times.push(formatTimeHHMM(h, m));
  }

  return times;
}

/** Returns true if hour falls in quiet hours (22-23 or 0-6). */
export function isQuietHour(hour: number): boolean {
  return hour >= 22 || hour <= 6;
}

/** "14:00" → "2:00 PM" */
export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Format hour and minute to "HH:MM" */
function formatTimeHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
