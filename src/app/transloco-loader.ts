import { Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import en from '../i18n/optimized/en.json';
import it from '../i18n/optimized/it.json';

const TRANSLATIONS: Record<string, Translation> = { it, en };

@Service()
export class TranslocoStaticLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['it']);
  }
}
