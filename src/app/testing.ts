import { Provider, signal } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { LiveStats } from './services/live-stats';
import { provideTranslocoPreload } from './transloco';

/** Provider Transloco reale (traduzioni precaricate) per i test. */
export function provideTranslocoTesting() {
  return [
    provideTransloco({
      config: {
        availableLangs: ['it', 'en'],
        defaultLang: 'it',
        fallbackLang: 'it',
        reRenderOnLangChange: true,
        prodMode: true,
      },
    }),
    provideTranslocoPreload(),
  ];
}

/** Stub di LiveStats: valori fissi, nessuna fetch. */
export function provideLiveStatsStub(): Provider {
  return {
    provide: LiveStats,
    useValue: {
      npmDownloads: signal(77749),
      githubStars: signal(263),
      packageDownloads: signal(new Map<string, number>()),
      repoStars: signal(new Map<string, number>()),
      start: () => {
        /* nessuna fetch nei test */
      },
    },
  };
}
