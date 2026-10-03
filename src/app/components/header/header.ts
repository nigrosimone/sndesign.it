import { Component, DOCUMENT, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ScrollSpy } from '../../directives/scroll-spy';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  imports: [TranslocoDirective, ScrollSpy]
})
export class Header {
  private readonly transloco = inject(TranslocoService);
  protected readonly lang = this.transloco.getActiveLang();
  // With <base href="/"> fragment-only hrefs ("#x") would always resolve to the
  // Italian home: they must be prefixed with the current language path.
  protected readonly base = this.lang === 'en' ? '/en/' : '/';
  private readonly doc = inject(DOCUMENT);

  // Read by .htaccess: who picks Italian is no longer sent to /en/ for the browser language.
  protected remember(lang: 'it' | 'en'): void {
    this.doc.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  }
}
