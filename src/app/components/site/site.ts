import {
  Component,
  DOCUMENT,
  VERSION,
  afterNextRender,
  inject,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
// The "optimized" files are already bundled (provideTranslocoPreload loads them):
// reusing them avoids shipping the raw JSON just for the meta tags.
import en from '../../../i18n/optimized/en.json';
import it from '../../../i18n/optimized/it.json';
import { AudioVisuals } from '../../services/audio-visuals';
import { LiveStats } from '../../services/live-stats';
import { MatrixRain } from '../../directives/matrix-rain';
import { About } from '../about/about';
import { Articles } from '../articles/articles';
import { AudioMixer } from '../audio-mixer/audio-mixer';
import { Contact } from '../contact/contact';
import { Header } from '../header/header';
import { Hero } from '../hero/hero';
import { Projects } from '../projects/projects';

const SITE_URL = 'https://www.sndesign.it/';
const META = {
  it: {
    title: it['meta.title'],
    description: it['meta.description'],
    ogDescription: it['meta.ogDescription'],
  },
  en: {
    title: en['meta.title'],
    description: en['meta.description'],
    ogDescription: en['meta.ogDescription'],
  },
} as const;

@Component({
  selector: 'app-site',
  templateUrl: './site.html',
  imports: [MatrixRain, Header, Hero, About, Projects, Articles, Contact, AudioMixer, TranslocoDirective]
})
export class Site {
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly liveStats = inject(LiveStats);
  private readonly audioVisuals = inject(AudioVisuals);

  protected readonly year = new Date().getFullYear();
  protected readonly ngVersion = VERSION.major;

  constructor() {
    const lang = (this.route.snapshot.data['lang'] as 'it' | 'en' | undefined) ?? 'it';
    this.transloco.setActiveLang(lang);

    // Per-route lang, title, meta and canonical: during prerendering these end up
    // directly in the static HTML of / and /en.
    this.doc.documentElement.lang = lang;

    const url = lang === 'en' ? `${SITE_URL}en/` : SITE_URL;
    const strings = META[lang];
    this.title.setTitle(strings.title);
    this.meta.updateTag({ name: 'description', content: strings.description });
    this.meta.updateTag({ property: 'og:title', content: strings.title });
    this.meta.updateTag({ property: 'og:description', content: strings.ogDescription });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:locale', content: lang === 'en' ? 'en_US' : 'it_IT' });
    this.meta.updateTag({ name: 'twitter:description', content: strings.ogDescription });
    this.doc.querySelector('link[rel="canonical"]')?.setAttribute('href', url);

    afterNextRender(() => {
      this.liveStats.start();
      this.audioVisuals.start();
    });
  }
}
