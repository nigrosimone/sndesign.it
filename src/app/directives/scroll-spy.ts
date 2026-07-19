import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Evidenzia la voce di menu della sezione correntemente in vista. Va applicato al
 * contenitore dei link (<ul>): legge il fragment di ogni <a>, individua le sezioni
 * corrispondenti e aggiunge/toglie la classe `is-current` sul link attivo.
 *
 * È solo stato visivo (nessuna animazione), quindi non dipende da
 * prefers-reduced-motion. Le API browser stanno dentro afterNextRender: durante il
 * prerender in Node non viene osservato nulla e il cleanup è registrato lì dentro.
 */
@Directive({ selector: '[appScrollSpy]' })
export class ScrollSpy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = this.elementRef.nativeElement;
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      this.destroyRef.onDestroy(() => this.observer?.disconnect());
      if (!('IntersectionObserver' in window)) {
        return;
      }
      const links = new Map<string, HTMLElement>();
      const sections: HTMLElement[] = [];
      for (const anchor of this.host.querySelectorAll<HTMLAnchorElement>('a[href*="#"]')) {
        const id = anchor.hash.slice(1);
        const section = id.length > 0 ? document.getElementById(id) : null;
        if (section) {
          links.set(id, anchor);
          sections.push(section);
        }
      }
      if (sections.length === 0) {
        return;
      }
      // Banda sottile centrata verticalmente: la sezione che la attraversa è quella
      // "corrente"; a inizio pagina (hero) nessuna la interseca ed è corretto così.
      const active = new Set<string>();
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              active.add(entry.target.id);
            } else {
              active.delete(entry.target.id);
            }
          }
          const current = sections.find((s) => active.has(s.id))?.id;
          for (const [id, link] of links) {
            const isCurrent = id === current;
            link.classList.toggle('is-current', isCurrent);
            // aria-current per screen reader/voice control (il colore da solo non basta)
            if (isCurrent) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          }
        },
        { rootMargin: '-45% 0px -45% 0px' },
      );
      for (const section of sections) {
        this.observer.observe(section);
      }
    });
  }
}
