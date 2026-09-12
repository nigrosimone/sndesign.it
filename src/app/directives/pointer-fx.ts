import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from './motion';

/**
 * Pointer-driven spotlight, holographic reflection and a slight 3D tilt (used on project
 * cards). Enabled only for fine pointers (mouse/trackpad) and motion-safe: on touch or with
 * prefers-reduced-motion the card stays static and relies on the centred CSS :hover glow.
 *
 * All browser APIs (matchMedia, listeners, requestAnimationFrame) live inside afterNextRender
 * so Node prerendering touches nothing, and the cleanup is registered there so
 * cancelAnimationFrame is never called on the server.
 */
@Directive({ selector: '[appPointerFx]' })
export class PointerFx {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = this.elementRef.nativeElement;
  private rafId = 0;
  private tilting = false;
  private rect?: DOMRect;
  // Listen only during an interaction: scrolling invalidates the cached, unrotated bounds.
  private readonly onViewportChange = (): void => {
    this.reset();
  };

  constructor() {
    afterNextRender(() => {
      // typeof guard: matchMedia does not exist under jsdom in tests, same as in motion.ts.
      const fine =
        typeof matchMedia === 'function' &&
        matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (prefersReducedMotion() || !fine) {
        return;
      }
      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerType === 'touch') {
          return;
        }
        this.schedule(ev.clientX, ev.clientY);
      };
      const onLeave = (): void => {
        this.reset();
      };
      this.el.addEventListener('pointermove', onMove);
      this.el.addEventListener('pointerleave', onLeave);
      this.el.addEventListener('pointercancel', onLeave);
      this.destroyRef.onDestroy(() => {
        this.el.removeEventListener('pointermove', onMove);
        this.el.removeEventListener('pointerleave', onLeave);
        this.el.removeEventListener('pointercancel', onLeave);
        this.reset();
      });
    });
  }

  private schedule(clientX: number, clientY: number): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.apply(clientX, clientY);
    });
  }

  private apply(clientX: number, clientY: number): void {
    // Measure once per interaction. A quick re-entry may interrupt the return transition,
    // so temporarily neutralize the transform before reading the unrotated bounds. Both
    // inline properties are restored in this frame, before anything is painted.
    if (this.rect === undefined) {
      const style = this.el.style;
      const transform = style.transform;
      const transitionProperty = style.transitionProperty;
      style.transitionProperty = 'none';
      style.transform = 'none';
      const measured = this.el.getBoundingClientRect();
      style.transform = transform;
      style.transitionProperty = transitionProperty;
      if (measured.width === 0 || measured.height === 0) {
        return;
      }
      this.rect = measured;
    }
    const rect = this.rect;
    // Raised contents can extend beyond the base rectangle: keep tilt and light in range.
    const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const max = 5; // degrees: deliberately subtle
    const rotateY = (px - 0.5) * 2 * max;
    const rotateX = (0.5 - py) * 2 * max;
    if (!this.tilting) {
      this.el.classList.add('is-tilting');
      this.tilting = true;
      window.addEventListener('scroll', this.onViewportChange, { capture: true, passive: true });
      window.addEventListener('resize', this.onViewportChange);
      window.addEventListener('blur', this.onViewportChange);
    }
    const style = this.el.style;
    style.setProperty('--mx', `${String(px * 100)}%`);
    style.setProperty('--my', `${String(py * 100)}%`);
    style.setProperty('--sheen-angle', `${String(125 + (px - 0.5) * 40 - (py - 0.5) * 15)}deg`);
    style.transform = `perspective(760px) rotateX(${String(rotateX)}deg) rotateY(${String(rotateY)}deg) translateY(-3px)`;
  }

  private reset(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.tilting) {
      window.removeEventListener('scroll', this.onViewportChange, true);
      window.removeEventListener('resize', this.onViewportChange);
      window.removeEventListener('blur', this.onViewportChange);
    }
    this.tilting = false;
    this.rect = undefined;
    const style = this.el.style;
    this.el.classList.remove('is-tilting');
    style.transform = '';
    style.removeProperty('--mx');
    style.removeProperty('--my');
    style.removeProperty('--sheen-angle');
  }
}
