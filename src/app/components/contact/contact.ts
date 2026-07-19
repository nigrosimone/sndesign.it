import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROFILE, SOCIALS } from '../../data/site-data';
import { Reveal } from '../../directives/reveal';
import { Scramble } from '../../directives/scramble';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  imports: [Reveal, Scramble, TranslocoDirective]
})
export class Contact {
  protected readonly profile = PROFILE;
  protected readonly socials = SOCIALS;
}
