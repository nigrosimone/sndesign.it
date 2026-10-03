import { LOCALES, type Lang } from './format';
import type { ContributionCalendar } from './types';

// SVG units: 10px squares every 13px, with room on the left for weekdays and on top for months.
export const CELL = 10;
const STEP = 13;
const LEFT = 28;
const TOP = 16;
const DAY_MS = 86_400_000;

export interface CalendarCell {
  x: number;
  y: number;
  level: string;
  count: number;
  date: string;
}

export interface CalendarLabel {
  x: number;
  y: number;
  text: string;
}

export interface CalendarLayout {
  width: number;
  height: number;
  cells: CalendarCell[];
  labels: CalendarLabel[];
}

/** GitHub-like layout: one column per week (Sunday first), one row per weekday. */
export function layoutCalendar(cal: ContributionCalendar, lang: Lang): CalendarLayout {
  const start = Date.parse(cal.from);
  const offset = new Date(start).getUTCDay();
  const weeks = Math.ceil((cal.counts.length + offset) / 7);
  const cells = cal.counts.map((count, i) => ({
    x: LEFT + Math.floor((i + offset) / 7) * STEP,
    y: TOP + ((i + offset) % 7) * STEP,
    level: cal.levels.charAt(i) || '0',
    count,
    date: new Date(start + i * DAY_MS).toISOString().slice(0, 10),
  }));

  // A month label on the first week of each month; the first one is dropped if too close to the next.
  const monthFmt = new Intl.DateTimeFormat(LOCALES[lang], { month: 'short', timeZone: 'UTC' });
  const months: CalendarLabel[] = [];
  let prevMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const day = new Date(start + Math.max(0, w * 7 - offset) * DAY_MS);
    if (day.getUTCMonth() !== prevMonth) {
      prevMonth = day.getUTCMonth();
      months.push({ x: LEFT + w * STEP, y: 9, text: monthFmt.format(day) });
    }
  }
  if (months.length > 1 && months[1].x - months[0].x < 3 * STEP) {
    months.shift();
  }

  // Monday, Wednesday and Friday, like GitHub (1 January 2024 is a Monday).
  const dayFmt = new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'short', timeZone: 'UTC' });
  const weekdays = [1, 3, 5].map((row) => ({
    x: 0,
    y: TOP + row * STEP + 8,
    text: dayFmt.format(Date.UTC(2024, 0, row)),
  }));

  return {
    width: LEFT + weeks * STEP - (STEP - CELL),
    height: TOP + 7 * STEP - (STEP - CELL),
    cells,
    labels: [...months, ...weekdays],
  };
}
