import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { formatNumber, type Lang } from '../data/format';
import { prefersReducedMotion } from './motion';

/**
 * Anima il contenuto testuale dell'elemento da 0 al valore indicato quando
 * entra nel viewport. Il valore finale è già nel markup prerenderizzato (SEO);
 * con prefers-reduced-motion non c'è animazione. Se il valore cambia dopo
 * l'animazione (stats live), il testo viene aggiornato senza rianimare.
 */
@Directive({ selector: '[appCountUp]' })
export class CountUp {
  readonly appCountUp = input.required<number>();
  readonly countUpSuffix = input('');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transloco = inject(TranslocoService);
  private readonly el = this.elementRef.nativeElement;
  private readonly lang = this.transloco.getActiveLang() as Lang;
  private observer?: IntersectionObserver;
  private rafId = 0;
  private settled = false;

  constructor() {
    effect(() => {
      const value = this.appCountUp();
      const suffix = this.countUpSuffix();
      if (this.settled) {
        this.render(value, suffix);
      }
    });

    // afterNextRender gira solo nel browser: le API qui dentro (e nel
    // cleanup) non esistono in Node durante il prerendering.
    afterNextRender(() => {
      this.destroyRef.onDestroy(() => {
        this.observer?.disconnect();
        cancelAnimationFrame(this.rafId);
      });
      if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        this.settle();
        return;
      }
      this.render(0, this.countUpSuffix());
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.observer?.disconnect();
            this.animate();
          }
        },
        { threshold: 0.4 },
      );
      this.observer.observe(this.el);
    });
  }

  private animate(): void {
    const duration = 1000;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.render(Math.round(this.appCountUp() * eased), this.countUpSuffix());
      if (t < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.settle();
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  private settle(): void {
    this.settled = true;
    this.render(this.appCountUp(), this.countUpSuffix());
  }

  private render(value: number, suffix: string): void {
    this.el.textContent = formatNumber(value, this.lang) + suffix;
  }
}
