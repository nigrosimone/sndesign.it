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
 * Animates the element's text from 0 to the given value when it enters the viewport.
 * The final value is already in the prerendered markup (SEO); prefers-reduced-motion skips
 * the animation. Later value changes (live stats) update the text without re-animating.
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

    // afterNextRender runs in the browser only: the APIs used here (and in the
    // cleanup) do not exist in Node during prerendering.
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
