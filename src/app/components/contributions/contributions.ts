import { Component, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CONTRIBUTION_STATS, CONTRIBUTIONS } from '../../data/contributions';
import { formatNumber, type Lang } from '../../data/format';
import { Reveal } from '../../directives/reveal';
import { Scramble } from '../../directives/scramble';

@Component({
  selector: 'app-contributions',
  templateUrl: './contributions.html',
  imports: [Reveal, Scramble, TranslocoDirective]
})
export class Contributions {
  private readonly transloco = inject(TranslocoService);
  private readonly lang = this.transloco.getActiveLang() as Lang;

  protected readonly stats = CONTRIBUTION_STATS;
  protected readonly contributions = CONTRIBUTIONS.map((c) => ({
    ...c,
    starsFmt: formatNumber(c.stars, this.lang),
  }));
}
