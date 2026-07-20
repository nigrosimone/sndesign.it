import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { formatNumber, type Lang } from '../../data/format';
import { OS_STATS } from '../../data/open-source';
import { PROFILE, SOCIALS } from '../../data/site-data';
import { CountUp } from '../../directives/count-up';
import { PointerFx } from '../../directives/pointer-fx';
import { Reveal } from '../../directives/reveal';
import { Scramble } from '../../directives/scramble';
import { LiveStats } from '../../services/live-stats';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  imports: [CountUp, PointerFx, Reveal, Scramble, TranslocoDirective]
})
export class Hero {
  private readonly live = inject(LiveStats);
  private readonly transloco = inject(TranslocoService);
  private readonly lang = this.transloco.getActiveLang() as Lang;

  // With <base href="/"> fragment-only hrefs would resolve to the Italian home.
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
