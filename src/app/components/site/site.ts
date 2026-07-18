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
// I file "optimized" sono già nel bundle (li importa il TranslocoStaticLoader):
// riusarli evita di impacchettare anche i JSON grezzi solo per i meta.
import en from '../../../i18n/optimized/en.json';
import it from '../../../i18n/optimized/it.json';
import { LiveStats } from '../../services/live-stats';
import { About } from '../about/about';
import { Articles } from '../articles/articles';
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
  imports: [Header, Hero, About, Projects, Articles, Contact, TranslocoDirective]
})
export class Site {
  protected readonly year = new Date().getFullYear();
  protected readonly ngVersion = VERSION.major;

  constructor() {
    const lang = (inject(ActivatedRoute).snapshot.data['lang'] as 'it' | 'en' | undefined) ?? 'it';
    inject(TranslocoService).setActiveLang(lang);

    // Lingua, title, meta e canonical per rotta: durante il prerendering
    // finiscono direttamente nell'HTML statico di / e /en.
    const doc = inject(DOCUMENT);
    doc.documentElement.lang = lang;

    const url = lang === 'en' ? `${SITE_URL}en/` : SITE_URL;
    const strings = META[lang];
    inject(Title).setTitle(strings.title);
    const meta = inject(Meta);
    meta.updateTag({ name: 'description', content: strings.description });
    meta.updateTag({ property: 'og:title', content: strings.title });
    meta.updateTag({ property: 'og:description', content: strings.ogDescription });
    meta.updateTag({ property: 'og:url', content: url });
    meta.updateTag({ property: 'og:locale', content: lang === 'en' ? 'en_US' : 'it_IT' });
    meta.updateTag({ name: 'twitter:description', content: strings.ogDescription });
    doc.querySelector('link[rel="canonical"]')?.setAttribute('href', url);

    const stats = inject(LiveStats);
    afterNextRender(() => {
      stats.start();
    });
  }
}
