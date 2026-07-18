export type Lang = 'it' | 'en';

const LOCALES: Record<Lang, string> = { it: 'it-IT', en: 'en-US' };

export function formatNumber(value: number, lang: Lang = 'it'): string {
  return new Intl.NumberFormat(LOCALES[lang]).format(value);
}

export function formatMonthYear(isoDate: string, lang: Lang = 'it'): string {
  // timeZone UTC: le date ISO senza orario sono UTC; senza questa opzione un
  // fuso negativo mostrerebbe il mese precedente per gli articoli del giorno 1.
  return new Intl.DateTimeFormat(LOCALES[lang], {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}
