import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideExperimentalWebMcpTools,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { provideTranslocoPreload } from './transloco';
import { WEBMCP_TOOLS } from './webmcp-tools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    provideTransloco({
      config: {
        availableLangs: ['it', 'en'],
        defaultLang: 'it',
        fallbackLang: 'it',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
    }),
    provideTranslocoPreload(),
    provideExperimentalWebMcpTools(WEBMCP_TOOLS),
  ],
};
