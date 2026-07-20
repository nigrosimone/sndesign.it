export type Lang = 'it' | 'en';

const LOCALES: Record<Lang, string> = { it: 'it-IT', en: 'en-US' };

export function formatNumber(value: number, lang: Lang = 'it'): string {
  return new Intl.NumberFormat(LOCALES[lang]).format(value);
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
