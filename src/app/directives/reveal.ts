import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { prefersReducedMotion } from './motion';

/**
 * Rivela l'elemento con una transizione quando entra nel viewport.
 * Il valore (opzionale) è il ritardo in millisecondi, per effetti a cascata.
 * Con prefers-reduced-motion (o senza JavaScript, grazie al gate CSS
 * "@media (scripting: enabled)") il contenuto è subito visibile.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class Reveal {
  readonly appReveal = input(0, { transform: numberAttribute });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // afterNextRender gira solo nel browser: niente API browser in Node
    // durante il prerendering (né nel cleanup registrato qui dentro).
    afterNextRender(() => {
      destroyRef.onDestroy(() => this.observer?.disconnect());
      if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        this.el.classList.add('reveal-in');
        return;
      }
      const delay = this.appReveal();
      if (delay > 0) {
        this.el.style.transitionDelay = `${String(delay)}ms`;
      }
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.el.classList.add('reveal-in');
            this.observer?.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -32px 0px' },
      );
      this.observer.observe(this.el);
    });
  }
}
