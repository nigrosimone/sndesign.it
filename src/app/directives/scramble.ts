import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from './motion';

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/<>*+=_';

/**
 * One-shot "decoding" effect: scrambles the element's text with random glyphs when it enters
 * the viewport, then locks it in left to right.
 *
 * The final text is already in the prerendered markup (SEO) with an sr-only copy alongside,
 * so the animated element must be marked aria-hidden. With prefers-reduced-motion or without
 * IntersectionObserver the text stays final. Browser APIs live inside afterNextRender so Node
 * prerendering is untouched.
 */
@Directive({ selector: '[appScramble]' })
export class Scramble {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = this.elementRef.nativeElement;
  private observer?: IntersectionObserver;
  private rafId = 0;

  constructor() {
    afterNextRender(() => {
      this.destroyRef.onDestroy(() => {
        this.observer?.disconnect();
        cancelAnimationFrame(this.rafId);
      });
      // textContent on an element is always a string (never null): it is the final
      // text already present in the prerendered markup.
      const target = this.el.textContent;
      if (
        prefersReducedMotion() ||
        !('IntersectionObserver' in window) ||
        target.trim().length === 0
      ) {
        return;
      }
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.observer?.disconnect();
            this.run(target);
          }
        },
        { threshold: 0.6 },
      );
      this.observer.observe(this.el);
    });
  }

  private run(target: string): void {
    const duration = 620;
    const start = performance.now();
    this.el.classList.add('is-scrambling');
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(t * target.length);
      const base = Math.floor(now / 32);
      let out = '';
      for (let i = 0; i < target.length; i++) {
        const ch = target.charAt(i);
        out += i < revealed || ch === ' ' ? ch : GLYPHS.charAt((base + i * 13) % GLYPHS.length);
      }
      this.el.textContent = out;
      if (t < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.el.classList.remove('is-scrambling');
        this.el.textContent = target;
      }
    };
    this.rafId = requestAnimationFrame(step);
  }
}
