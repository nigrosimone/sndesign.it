import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import en from '../i18n/optimized/en.json';
import it from '../i18n/optimized/it.json';

const TRANSLATIONS: Record<string, Translation> = { it, en };

/**
 * Loader statico: importa le traduzioni ottimizzate da Transloco Optimize
 * (chiavi flat, senza commenti - vedi scripts/optimize-i18n.mjs) direttamente
 * nel bundle: niente HTTP e rendering sincrono anche durante il prerendering SSG.
 */
@Injectable({ providedIn: 'root' })
export class TranslocoStaticLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['it']);
  }
}
