import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Highlights the menu entry of the section currently in view. Apply it to the link container
 * (<ul>): it reads each <a> fragment, resolves the matching sections and toggles `is-current`
 * on the active link.
 *
 * Visual state only (no animation), so it does not depend on prefers-reduced-motion. Browser
 * APIs live inside afterNextRender: nothing is observed during Node prerendering and the
 * cleanup is registered there too.
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
      // Thin vertically centred band: the section crossing it is the "current" one; at the
      // top of the page (hero) none intersects, which is intended.
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
            // aria-current for screen readers / voice control: colour alone is not enough
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
