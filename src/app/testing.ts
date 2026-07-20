import { Provider, signal } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { LiveStats } from './services/live-stats';
import { provideTranslocoPreload } from './transloco';

/** Real Transloco providers (preloaded translations) for tests. */
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

/** LiveStats stub: fixed values, no fetch. */
export function provideLiveStatsStub(): Provider {
  return {
    provide: LiveStats,
    useValue: {
      npmDownloads: signal(77749),
      githubStars: signal(263),
      packageDownloads: signal(new Map<string, number>()),
      repoStars: signal(new Map<string, number>()),
      start: () => {
        /* no fetch in tests */
      },
    },
  };
}
