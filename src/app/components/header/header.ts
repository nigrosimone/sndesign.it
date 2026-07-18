import { Component, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  imports: [TranslocoDirective]
})
export class Header {
  protected readonly lang = inject(TranslocoService).getActiveLang();
  // Con <base href="/"> gli href solo-frammento ("#x") risolverebbero sempre
  // sulla home italiana: vanno prefissati con il percorso della lingua corrente.
  protected readonly base = this.lang === 'en' ? '/en/' : '/';
}
