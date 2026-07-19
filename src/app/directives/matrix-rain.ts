import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { prefersReducedMotion } from './motion';

// Katakana a mezza larghezza + cifre: il set "classico" della pioggia Matrix.
const GLYPHS =
  'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

/**
 * Pioggia di codice "Matrix" discreta su un <canvas> di sfondo. Ciano (accento del
 * sito), trasparente tra i glifi: griglia e bagliori restano visibili dietro. Gira
 * a ~30fps con devicePixelRatio limitato per restare leggera; la scia si crea con
 * un fade in destination-out (i glifi svaniscono verso il trasparente, non verso il
 * nero, così non copre lo sfondo).
 *
 * Tutto sta dentro afterNextRender (niente canvas/animazioni durante il prerender in
 * Node) col cleanup registrato lì dentro; con prefers-reduced-motion non parte.
 */
@Directive({ selector: '[appMatrixRain]' })
export class MatrixRain {
  private readonly elementRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = this.elementRef.nativeElement;
  private readonly fontSize = 18;
  private ctx: CanvasRenderingContext2D | null = null;
  private columns = 0;
  private drops: number[] = [];
  private rafId = 0;
  private frame = 0;

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        return;
      }
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        return;
      }
      const onResize = (): void => {
        this.resize();
      };
      this.resize();
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(this.rafId);
      });
      this.rafId = requestAnimationFrame(() => {
        this.draw();
      });
    });
  }

  private resize(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio, 2);
    // Impostare width/height azzera il contesto (transform incluso): reimposto dopo.
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.columns = Math.ceil(window.innerWidth / this.fontSize);
    this.drops = Array.from({ length: this.columns }, () => Math.floor(Math.random() * -50));
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.draw();
    });
    // ~20fps: disegno un frame ogni tre → caduta più lenta e ancora più leggera.
    this.frame += 1;
    if (this.frame % 4 !== 0) {
      return;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Sfuma i glifi del frame precedente verso il trasparente (scia).
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.fillRect(0, 0, width, height);
    // Nuovi glifi in ciano tenue.
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${String(this.fontSize)}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
    for (let i = 0; i < this.columns; i++) {
      const ch = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      ctx.fillText(ch, i * this.fontSize, this.drops[i] * this.fontSize);
      if (this.drops[i] * this.fontSize > height && Math.random() > 0.975) {
        this.drops[i] = 0;
      } else {
        this.drops[i] += 1;
      }
    }
  }
}
