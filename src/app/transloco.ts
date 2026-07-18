import { inject, provideAppInitializer } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import en from '../i18n/optimized/en.json';
import it from '../i18n/optimized/it.json';

export function provideTranslocoPreload() {
  return provideAppInitializer(() => {
    const transloco = inject(TranslocoService);
    transloco.setTranslation(it, 'it');
    transloco.setTranslation(en, 'en');
  });
}
