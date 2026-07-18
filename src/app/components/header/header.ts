import { Component, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  imports: [TranslocoDirective]
})
export class Header {
  private readonly transloco = inject(TranslocoService);
  protected readonly lang = this.transloco.getActiveLang();
  // Con <base href="/"> gli href solo-frammento ("#x") risolverebbero sempre
  // sulla home italiana: vanno prefissati con il percorso della lingua corrente.
  protected readonly base = this.lang === 'en' ? '/en/' : '/';
}
