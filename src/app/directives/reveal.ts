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
 * Reveals the element with a transition when it enters the viewport; the optional value is
 * a delay in milliseconds for staggered effects. With prefers-reduced-motion (or without
 * JavaScript, thanks to the `@media (scripting: enabled)` CSS gate) content is visible at once.
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class Reveal {
  readonly appReveal = input(0, { transform: numberAttribute });

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = this.elementRef.nativeElement;
  private observer?: IntersectionObserver;

  constructor() {
    // afterNextRender runs in the browser only: no browser APIs in Node during
    // prerendering, nor in the cleanup registered inside it.
    afterNextRender(() => {
      this.destroyRef.onDestroy(() => this.observer?.disconnect());
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
