import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from './motion';

/**
 * Spotlight ciano che segue il puntatore + leggera inclinazione 3D sull'elemento
 * (usato sulle card progetti). Attivo solo con puntatore fine (mouse/trackpad) e
 * motion-safe: su touch o con prefers-reduced-motion la card resta statica e le
 * basta il bagliore centrato di :hover in CSS.
 *
 * Tutte le API browser (matchMedia, listener, requestAnimationFrame) stanno dentro
 * afterNextRender, così durante il prerender in Node non viene toccato nulla; il
 * cleanup è registrato lì dentro per non chiamare cancelAnimationFrame lato server.
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
      // Guardia su typeof: in ambiente di test (jsdom) matchMedia non esiste,
      // come in motion.ts; senza puntatore fine la directive resta inerte.
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
    // Misuro il rect una sola volta per interazione, mentre il transform è ancora
    // assente: rileggerlo a ogni frame restituirebbe il box GIÀ inclinato (e sarebbe
    // una getBoundingClientRect in più per frame). Si azzera in reset().
    if (this.rect === undefined) {
      const measured = this.el.getBoundingClientRect();
      if (measured.width === 0 || measured.height === 0) {
        return;
      }
      this.rect = measured;
    }
    const rect = this.rect;
    const px = (clientX - rect.left) / rect.width; // 0..1 orizzontale
    const py = (clientY - rect.top) / rect.height; // 0..1 verticale
    const max = 5; // gradi: effetto volutamente sottile
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
