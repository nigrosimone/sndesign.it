import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SKILL_GROUPS } from '../../data/site-data';
import { Reveal } from '../../directives/reveal';
import { Scramble } from '../../directives/scramble';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  imports: [Reveal, Scramble, TranslocoDirective]
})
export class About {
  protected readonly bioKeys = ['about.bio1', 'about.bio2', 'about.bio3'];
  protected readonly skillGroups = SKILL_GROUPS;
}
