import { Component, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ARTICLES } from '../../data/articles';
import { formatMonthYear, type Lang } from '../../data/format';
import { Reveal } from '../../directives/reveal';

const VISIBLE_ARTICLES = 6;

@Component({
  selector: 'app-articles',
  templateUrl: './articles.html',
  imports: [Reveal, TranslocoDirective]
})
export class Articles {
  private readonly transloco = inject(TranslocoService);
  private readonly lang = this.transloco.getActiveLang() as Lang;

  protected readonly articles = ARTICLES.slice(0, VISIBLE_ARTICLES).map((a) => ({
    ...a,
    dateFmt: formatMonthYear(a.date, this.lang),
  }));
}
