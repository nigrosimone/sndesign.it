import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { formatNumber, type Lang } from '../../data/format';
import { OS_STATS, PROJECTS } from '../../data/open-source';
import { Reveal } from '../../directives/reveal';
import { LiveStats } from '../../services/live-stats';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  imports: [Reveal, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  private readonly live = inject(LiveStats);
  private readonly lang = inject(TranslocoService).getActiveLang() as Lang;

  protected readonly packagesCount = OS_STATS.npmPackages;
  protected readonly downloadsFmt = computed(() =>
    formatNumber(this.live.npmDownloads(), this.lang),
  );
  protected readonly projects = computed(() => {
    const liveStars = this.live.repoStars();
    const liveDownloads = this.live.packageDownloads();
    return PROJECTS.map((p) => {
      const monthlyDownloads = liveDownloads.get(p.name) ?? p.monthlyDownloads;
      return {
        ...p,
        stars: liveStars.get(p.name) ?? p.stars,
        downloadsFmt: monthlyDownloads ? formatNumber(monthlyDownloads, this.lang) : null,
        registry: p.language === 'PHP' ? 'packagist' : 'npm',
      };
    });
  });
}
