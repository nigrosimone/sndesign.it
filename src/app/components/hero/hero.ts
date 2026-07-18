import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { formatNumber, type Lang } from '../../data/format';
import { OS_STATS } from '../../data/open-source';
import { PROFILE, SOCIALS } from '../../data/site-data';
import { CountUp } from '../../directives/count-up';
import { Reveal } from '../../directives/reveal';
import { LiveStats } from '../../services/live-stats';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  imports: [CountUp, Reveal, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly live = inject(LiveStats);
  private readonly lang = inject(TranslocoService).getActiveLang() as Lang;

  // Con <base href="/"> gli href solo-frammento risolverebbero sulla home italiana.
  protected readonly base = this.lang === 'en' ? '/en/' : '/';
  protected readonly socials = SOCIALS;
  protected readonly stats = computed(() => [
    this.stat(this.live.npmDownloads(), '', 'hero.stats.downloads'),
    this.stat(this.live.githubStars(), '+', 'hero.stats.stars'),
    this.stat(OS_STATS.npmPackages, '', 'hero.stats.packages'),
    this.stat(new Date().getFullYear() - PROFILE.codingSinceYear, '', 'hero.stats.years'),
  ]);

  private stat(value: number, suffix: string, labelKey: string) {
    return { value, suffix, labelKey, valueFmt: formatNumber(value, this.lang) + suffix };
  }
}
