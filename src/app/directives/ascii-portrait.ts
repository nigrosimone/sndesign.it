import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { prefersReducedMotion } from './motion';

// Canvas units: 320x320 like the photo below, one glyph every 4x7.
const SIZE = 320;
const CELL_W = 4;
const CELL_H = 7;
const RAMP = ' .:-=+*#%@';
const TONES = [0.3, 0.45, 0.6, 0.75, 0.9, 1].map((a) => `rgba(0, 229, 255, ${String(a)})`);
const HOT = '#e6edf5';
const RADIUS = 40;
const FONT = '600 7.5px ui-monospace, Consolas, monospace';

interface Glyph {
  char: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  density: number;
  tone: number;
}

/** Maps a brightness in [0, 1] to a glyph of the ramp, darkest first. */
export function glyphFor(brightness: number): string {
  const i = Math.floor(brightness * RAMP.length);
  return RAMP.charAt(Math.min(RAMP.length - 1, Math.max(0, i)));
}

/** Glyph brightness of a pixel at (x, y) in [0, 1]: contrast stretched, corners faded out. */
export function brightness(luma: number, x: number, y: number): number {
  const level = Math.min(1, Math.max(0, (luma - 0.05) / 0.85));
  const vignette = Math.min(1, Math.max(0, (0.75 - Math.hypot(x - 0.5, y - 0.45)) / 0.25));
  return level * vignette;
}

/**
 * ASCII layer over the portrait on a <canvas>: when it scrolls into view the glyphs fly in and
 * take their place, then the pointer swirls them away and they come back. The <img> stays below,
 * dimmed by the CSS once the canvas is ready, so the face is still recognizable.
 *
 * The animation loop stops when every glyph is back home and the pointer is outside.
 */
@Directive({ selector: 'canvas[appAsciiPortrait]' })
export class AsciiPortrait {
  readonly appAsciiPortrait = input.required<string>();

  private readonly canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private ctx: CanvasRenderingContext2D | null = null;
  private glyphs: Glyph[] = [];
  private pointerX = -1e4;
  private pointerY = -1e4;
  private rafId = 0;

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect();
            void this.start();
          }
        },
        { threshold: 0.35 },
      );
      observer.observe(this.canvas);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        cancelAnimationFrame(this.rafId);
      });
    });
  }

  private async start(): Promise<void> {
    const img = new Image();
    img.src = this.appAsciiPortrait();
    try {
      await img.decode();
    } catch {
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }
    this.glyphs = this.sample(img);
    this.resize();
    this.canvas.classList.add('is-on');

    const onResize = (): void => {
      this.resize();
      this.wake();
    };
    const onMove = (ev: PointerEvent): void => {
      const box = this.canvas.getBoundingClientRect();
      this.pointerX = ((ev.clientX - box.left) * SIZE) / box.width;
      this.pointerY = ((ev.clientY - box.top) * SIZE) / box.height;
      this.wake();
    };
    const onLeave = (): void => {
      this.pointerX = this.pointerY = -1e4;
    };
    window.addEventListener('resize', onResize);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerdown', onMove);
    this.canvas.addEventListener('pointerleave', onLeave);
    this.canvas.addEventListener('pointercancel', onLeave);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      this.canvas.removeEventListener('pointermove', onMove);
      this.canvas.removeEventListener('pointerdown', onMove);
      this.canvas.removeEventListener('pointerleave', onLeave);
      this.canvas.removeEventListener('pointercancel', onLeave);
    });
    this.wake();
  }

  /** One glyph per cell, scattered around the portrait so that they fly in. Sorted by tone. */
  private sample(img: HTMLImageElement): Glyph[] {
    const cols = SIZE / CELL_W;
    const rows = Math.floor(SIZE / CELL_H);
    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    if (!sctx) {
      return [];
    }
    sctx.drawImage(img, 0, 0, cols, rows);
    const data = sctx.getImageData(0, 0, cols, rows).data;
    const glyphs: Glyph[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const p = (row * cols + col) * 4;
        const luma = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        const b = brightness(luma, (col + 0.5) / cols, (row + 0.5) / rows);
        const char = glyphFor(b);
        if (char === ' ') {
          continue;
        }
        const baseX = col * CELL_W;
        const baseY = (row + 1) * CELL_H;
        const angle = Math.atan2(baseY - SIZE / 2, baseX - SIZE / 2) + Math.random() * 2;
        const dist = Math.hypot(baseX - SIZE / 2, baseY - SIZE / 2) + 100 + Math.random() * 230;
        glyphs.push({
          char,
          x: SIZE / 2 + Math.cos(angle) * dist,
          y: SIZE / 2 + Math.sin(angle) * dist,
          baseX,
          baseY,
          density: 5 + Math.random() * 15,
          tone: Math.min(TONES.length - 1, Math.floor(b * TONES.length)),
        });
      }
    }
    return glyphs.sort((a, b) => a.tone - b.tone);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const size = Math.round(this.canvas.clientWidth * dpr);
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx?.setTransform(size / SIZE, 0, 0, size / SIZE, 0, 0);
  }

  private wake(): void {
    if (this.rafId === 0) {
      this.rafId = requestAnimationFrame(() => {
        this.frame();
      });
    }
  }

  private frame(): void {
    this.rafId = 0;
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.font = FONT;
    const px = this.pointerX;
    const py = this.pointerY;
    const hot: Glyph[] = [];
    let moving = false;
    let tone = -1;
    for (const g of this.glyphs) {
      const dx = px - g.x;
      const dy = py - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < RADIUS && dist > 0) {
        // Pushed away from the pointer and sideways: the glyphs swirl around it.
        const force = ((RADIUS - dist) / RADIUS) * g.density * 0.6;
        const nx = dx / dist;
        const ny = dy / dist;
        g.x -= (nx + ny * 1.5) * force;
        g.y -= (ny - nx * 1.5) * force;
      } else {
        // Back home, faster for the lighter glyphs.
        const ease = g.density * 0.85;
        g.x = Math.abs(g.x - g.baseX) < 0.5 ? g.baseX : g.x - (g.x - g.baseX) / ease;
        g.y = Math.abs(g.y - g.baseY) < 0.5 ? g.baseY : g.y - (g.y - g.baseY) / ease;
      }
      if (g.x !== g.baseX || g.y !== g.baseY) {
        moving = true;
        if ((g.x - g.baseX) ** 2 + (g.y - g.baseY) ** 2 > 4) {
          hot.push(g);
          continue;
        }
      }
      if (g.tone !== tone) {
        tone = g.tone;
        ctx.fillStyle = TONES[tone];
      }
      ctx.fillText(g.char, g.x, g.y);
    }
    // Glyphs out of place light up in the accent colour.
    ctx.fillStyle = HOT;
    for (const g of hot) {
      ctx.fillText(g.char, g.x, g.y);
    }
    if (moving || px > -1e4) {
      this.wake();
    }
  }
}
