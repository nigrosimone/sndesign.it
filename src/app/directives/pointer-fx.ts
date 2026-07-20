import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from './motion';

/**
 * Cyan spotlight following the pointer plus a slight 3D tilt on the element (used on project
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

  constructor() {
    afterNextRender(() => {
      // typeof guard: matchMedia does not exist under jsdom in tests, same as in motion.ts.
      const fine =
        typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (prefersReducedMotion() || !fine) {
        return;
      }
      const onMove = (ev: PointerEvent): void => {
        this.schedule(ev.clientX, ev.clientY);
      };
      const onLeave = (): void => {
        this.reset();
      };
      this.el.addEventListener('pointermove', onMove);
      this.el.addEventListener('pointerleave', onLeave);
      this.destroyRef.onDestroy(() => {
        this.el.removeEventListener('pointermove', onMove);
        this.el.removeEventListener('pointerleave', onLeave);
        cancelAnimationFrame(this.rafId);
      });
    });
  }

  private schedule(clientX: number, clientY: number): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.apply(clientX, clientY);
    });
  }

  private apply(clientX: number, clientY: number): void {
    // Measure the rect once per interaction, while the transform is still absent: re-reading
    // it every frame would return the already tilted box (and cost an extra
    // getBoundingClientRect per frame). Cleared in reset().
    if (this.rect === undefined) {
      const measured = this.el.getBoundingClientRect();
      if (measured.width === 0 || measured.height === 0) {
        return;
      }
      this.rect = measured;
    }
    const rect = this.rect;
    const px = (clientX - rect.left) / rect.width; // 0..1 horizontal
    const py = (clientY - rect.top) / rect.height; // 0..1 vertical
    const max = 5; // degrees: deliberately subtle
    const rotateY = (px - 0.5) * 2 * max;
    const rotateX = (0.5 - py) * 2 * max;
    if (!this.tilting) {
      this.el.classList.add('is-tilting');
      this.tilting = true;
    }
    const style = this.el.style;
    style.setProperty('--mx', `${String(px * 100)}%`);
    style.setProperty('--my', `${String(py * 100)}%`);
    style.transform = `perspective(760px) rotateX(${String(rotateX)}deg) rotateY(${String(rotateY)}deg) translateY(-3px)`;
  }

  private reset(): void {
    cancelAnimationFrame(this.rafId);
    this.tilting = false;
    this.rect = undefined;
    const style = this.el.style;
    this.el.classList.remove('is-tilting');
    style.transform = '';
    style.removeProperty('--mx');
    style.removeProperty('--my');
  }
}
