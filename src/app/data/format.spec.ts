import { formatMonthYear, formatNumber } from './format';

describe('format', () => {
  it('formats numbers per locale', () => {
    expect(formatNumber(77749, 'it')).toBe('77.749');
    expect(formatNumber(77749, 'en')).toBe('77,749');
  });

  it('formats month/year per locale', () => {
    expect(formatMonthYear('2026-03-03', 'it')).toMatch(/mar 2026/i);
    expect(formatMonthYear('2026-03-03', 'en')).toMatch(/Mar 2026/);
  });
});
