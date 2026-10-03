export type Lang = 'it' | 'en';

export const LOCALES: Record<Lang, string> = { it: 'it-IT', en: 'en-US' };

export function formatNumber(value: number, lang: Lang = 'it'): string {
  return new Intl.NumberFormat(LOCALES[lang]).format(value);
}

/** Rounded down to the thousand, for texts that say "over N": 95,065 is "95,000". */
export function formatThousands(value: number, lang: Lang = 'it'): string {
  return formatNumber(Math.floor(value / 1000) * 1000, lang);
}

export function formatMonthYear(isoDate: string, lang: Lang = 'it'): string {
  // timeZone UTC: date-only ISO strings are UTC; without it a negative offset
  // would show the previous month for articles dated the 1st.
  return new Intl.DateTimeFormat(LOCALES[lang], {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}
