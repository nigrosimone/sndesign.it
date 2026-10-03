import { layoutCalendar } from './calendar';

describe('layoutCalendar', () => {
  // 2025-09-28 is a Sunday: 371 days fill exactly 53 weeks, like the GitHub calendar.
  const year = {
    from: '2025-09-28',
    total: 371,
    levels: '1'.repeat(371),
    counts: Array<number>(371).fill(1),
  };

  it('puts one week per column and one weekday per row', () => {
    const { cells, width, height } = layoutCalendar(year, 'en');
    expect(cells[0]).toEqual({ x: 28, y: 16, level: '1', count: 1, date: '2025-09-28' });
    expect(cells[1]).toMatchObject({ x: 28, y: 29, date: '2025-09-29' });
    expect(cells[7]).toMatchObject({ x: 41, y: 16, date: '2025-10-05' });
    expect(cells.at(-1)).toMatchObject({ x: 28 + 52 * 13, y: 16 + 6 * 13, date: '2026-10-03' });
    expect(width).toBe(28 + 53 * 13 - 3);
    expect(height).toBe(16 + 7 * 13 - 3);
  });

  it('starts in the right row when the first day is not a Sunday', () => {
    const { cells } = layoutCalendar({ ...year, from: '2025-10-01' }, 'en');
    expect(cells[0]).toMatchObject({ x: 28, y: 16 + 3 * 13 });
  });

  it('labels months and weekdays in the page language', () => {
    const texts = (lang: 'it' | 'en') => layoutCalendar(year, lang).labels.map((l) => l.text);
    // September has only its last week: too close to October, so it gets no label.
    expect(texts('en').slice(0, 2)).toEqual(['Oct', 'Nov']);
    expect(texts('en').slice(-3)).toEqual(['Mon', 'Wed', 'Fri']);
    expect(texts('it').slice(-3)).toEqual(['lun', 'mer', 'ven']);
  });
});
