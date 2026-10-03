import { Component, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { formatThousands, type Lang } from '../../data/format';
import { OS_STATS } from '../../data/open-source';
import { EXPERIENCE, SKILL_GROUPS } from '../../data/site-data';
import { AsciiPortrait } from '../../directives/ascii-portrait';
import { Reveal } from '../../directives/reveal';
import { Scramble } from '../../directives/scramble';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  imports: [AsciiPortrait, Reveal, Scramble, TranslocoDirective]
})
export class About {
  private readonly lang = inject(TranslocoService).getActiveLang() as Lang;

  protected readonly bioKeys = ['about.bio1', 'about.bio2', 'about.bio3'];
  protected readonly skillGroups = SKILL_GROUPS;
  protected readonly experience = EXPERIENCE;
  // Same number as the hero, rounded down because the text says "over".
  protected readonly bioParams = { downloads: formatThousands(OS_STATS.npmMonthlyDownloads, this.lang) };
  // Generated at build time by scripts/build-cv.mjs.
  protected readonly cvUrl = `/simone-nigro-cv-${this.lang}.pdf`;
}
