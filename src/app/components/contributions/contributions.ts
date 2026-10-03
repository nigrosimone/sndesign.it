import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CELL, layoutCalendar } from '../../data/calendar';
import { CONTRIBUTION_CALENDAR, CONTRIBUTION_STATS, CONTRIBUTIONS } from '../../data/contributions';
import { LOCALES, formatNumber, type Lang } from '../../data/format';
import type { Contribution } from '../../data/types';
import { Reveal } from '../../directives/reveal';
import { Scramble } from '../../directives/scramble';

/** Pull requests grouped by repo, keeping the order of the data (repos sorted by stars). */
function byRepo(prs: readonly Contribution[]): Contribution[][] {
  const groups = new Map<string, Contribution[]>();
  for (const pr of prs) {
    groups.set(pr.repo, [...(groups.get(pr.repo) ?? []), pr]);
  }
  return [...groups.values()];
}

@Component({
  selector: 'app-contributions',
  templateUrl: './contributions.html',
  imports: [Reveal, Scramble, TranslocoDirective]
})
export class Contributions {
  private readonly transloco = inject(TranslocoService);
  private readonly lang = this.transloco.getActiveLang() as Lang;

  protected readonly stats = CONTRIBUTION_STATS;
  // One block per repo (already sorted by stars), so the stars are shown once.
  protected readonly groups = byRepo(CONTRIBUTIONS).map((prs) => ({
    repo: prs[0].repo,
    repoUrl: prs[0].repoUrl,
    starsFmt: formatNumber(prs[0].stars, this.lang),
    prs,
  }));

  protected readonly cell = CELL;
  protected readonly calendar = layoutCalendar(CONTRIBUTION_CALENDAR, this.lang);
  protected readonly calendarTotal = formatNumber(CONTRIBUTION_CALENDAR.total, this.lang);
  protected readonly tip = signal<{ text: string; left: number; top: number } | null>(null);
  // One tooltip for the whole calendar: the hovered square is found by its position.
  private readonly cellAt = new Map(this.calendar.cells.map((c) => [`${String(c.x)},${String(c.y)}`, c]));
  private readonly dateFmt = new Intl.DateTimeFormat(LOCALES[this.lang], {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });

  protected showTip(event: Event): void {
    const rect = event.target as Element;
    const cell = this.cellAt.get(`${String(rect.getAttribute('x'))},${String(rect.getAttribute('y'))}`);
    const figure = rect.closest('figure');
    if (!cell || !figure) {
      this.tip.set(null);
      return;
    }
    const box = rect.getBoundingClientRect();
    const frame = figure.getBoundingClientRect();
    const params = { count: cell.count, date: this.dateFmt.format(new Date(cell.date)) };
    this.tip.set({
      text: this.transloco.translate(cell.count === 1 ? 'contributions.dayOne' : 'contributions.day', params),
      left: box.left + box.width / 2 - frame.left,
      top: box.top - frame.top,
    });
  }
}
