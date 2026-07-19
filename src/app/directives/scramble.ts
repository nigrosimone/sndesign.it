import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from './motion';

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/<>*+=_';

/**
 * "Decodifica" il testo dell'elemento con caratteri casuali quando entra nel
 * viewport, poi lo fissa progressivamente da sinistra a destra. Effetto one-shot.
 *
 * Il testo finale è già nel markup prerenderizzato (SEO) e accanto c'è una copia
 * sr-only per gli screen reader: l'elemento animato va marcato aria-hidden. Con
 * prefers-reduced-motion o senza IntersectionObserver il testo resta subito quello
 * finale. Le API browser stanno dentro afterNextRender (prerender Node al sicuro).
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
      // textContent su un elemento è sempre una stringa (mai null): è il testo
      // finale già presente nel markup prerenderizzato.
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
