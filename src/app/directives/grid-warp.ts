import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { AmbientAudio, VOICE } from '../services/ambient-audio';
import { prefersReducedMotion } from './motion';
import { type PointerTracker, trackPointer } from './pointer-tracker';

// Same lattice as the CSS grid this canvas replaces (styles.scss, html::before).
const CELL = 44;
// html::before sits at inset -80px, so its lines land on x ≡ -80 (mod 44) = 8: keeping the
// same phase means turning the canvas on does not shift the grid.
const GRID_OFFSET = 8;
const LINE = '0, 229, 255';
const LINE_ALPHA = 0.09;
/** Grid opacity with the music off: the value html::before uses. */
const IDLE_OPACITY = 0.55;

/** Radius of the black hole's influence, in CSS pixels: outside it the grid stays straight. */
export const HOLE_RADIUS = 360;
/** No line ever reaches inside this radius, and whatever gets close is rubbed out anyway. */
export const EVENT_HORIZON = 34;
// Pull "mass": the deflection goes as MASS/distance, like a gravitational lens, so it grows
// fast close to the horizon and is already negligible halfway out. It scales with the square of
// the radius, so this is what keeps the shape of the well when the other two sizes change.
const HOLE_MASS = 4000;
/** Shortest distance between samples along a warped line, right at the horizon. */
const SAMPLE = 6;
// Farther out the step grows with the distance instead: that keeps the angular resolution
// constant, so the tight bend stays smooth while the nearly straight far field, which is most
// of the influence disc, costs a handful of points instead of a hundred.
const SAMPLE_SPREAD = 0.12;
// How far the darkness reaches: from here inwards the lattice fades out into the abyss. Kept
// tight on purpose, because the bend is strongest close to the hole and erasing it too early
// would throw away the very thing the warp is there to show.
const FADE_REACH = 130;
/** Minimum gap between repaints (ms): ~30fps, same budget as the rain. */
const FRAME_MS = 33;

/**
 * Gravitational pull of the black hole at `distance` from its centre, in CSS pixels, positive
 * towards the centre. Inverse-distance falloff windowed by a raised cosine, so it reaches zero
 * with zero slope at {@link HOLE_RADIUS} and the warped area has no visible edge.
 *
 * The pull saturates at `distance - EVENT_HORIZON`: points never cross the horizon, they pile up
 * just outside it. Points that start inside get a negative pull, i.e. they are pushed back out
 * onto the horizon. That pile-up is then rubbed out by the fade, so the void has no edge.
 */
export function holePull(distance: number): number {
  if (distance >= HOLE_RADIUS) {
    return 0;
  }
  const falloff = (1 + Math.cos((distance / HOLE_RADIUS) * Math.PI)) / 2;
  return Math.min(distance - EVENT_HORIZON, (HOLE_MASS / Math.max(distance, 1)) * falloff);
}

/**
 * Redraws the fixed background grid on a <canvas> so the pointer can bend it: the lattice is
 * sucked towards the cursor like light around a black hole ({@link holePull}) and fades out as
 * it falls in, until nothing is left. Nothing is ever outlined: no ring, no halo, no circle that
 * could read as a cursor, just the lines dimming into the abyss. It complements the rain's lens,
 * which pushes glyphs outward instead, so the two layers read as bulge over void.
 *
 * It is a drop-in replacement for the html::before grid (same 44px pitch, same phase, same
 * colour): the directive adds `.grid-warped` to <html> only once it is actually running, and the
 * CSS grid is hidden by that class alone. So no-JS, prerendering, coarse pointers and
 * prefers-reduced-motion all keep the original static grid, at zero cost.
 *
 * Audio-reactive like the CSS it replaces: the "pad" voice drives the grid brightness. The loop
 * repaints at most ~30fps and skips the frame entirely when pointer, lens and brightness are all
 * unchanged, so a still cursor costs nothing.
 */
@Directive({ selector: '[appGridWarp]' })
export class GridWarp {
  private readonly elementRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly audio = inject(AmbientAudio);
  private readonly canvas = this.elementRef.nativeElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private pointer: PointerTracker | null = null;
  private rafId = 0;
  private last = 0;
  /** Smoothed strength, 1 with the pointer over the page and 0 once it leaves. */
  private lens = 0;
  // Last painted state: while it matches the current one the frame is skipped.
  private paintedLens = -1;
  private paintedOpacity = -1;
  private paintedX = -1;
  private paintedY = -1;

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        return;
      }
      // Without a pointer there is nothing to warp: leaving the CSS grid in place is both
      // cheaper and pixel-identical.
      this.pointer = trackPointer(this.destroyRef);
      if (!this.pointer) {
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
      // Hides html::before: from here on the canvas owns the grid.
      document.documentElement.classList.add('grid-warped');
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        document.documentElement.classList.remove('grid-warped');
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
    // Setting width/height resets the context (transform included), so re-apply it after.
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paintedOpacity = -1; // forces a repaint: the resize cleared the canvas
  }

  private draw(): void {
    this.rafId = requestAnimationFrame(() => {
      this.draw();
    });
    const ctx = this.ctx;
    const pointer = this.pointer;
    if (!ctx || !pointer) {
      return;
    }
    const now = performance.now();
    if (now - this.last < FRAME_MS) {
      return;
    }
    this.last = now;

    this.lens += (pointer.target - this.lens) * 0.12;
    // Snap once the exponential smoothing is visually done, otherwise `lens` keeps changing by
    // fractions forever and the frame is never skipped.
    if (Math.abs(pointer.target - this.lens) < 0.002) {
      this.lens = pointer.target;
    }
    // Same brightness curve html::before had: the "pad" voice drives it, music off = original.
    const playing = this.audio.playing();
    const pad = playing ? this.audio.voiceEnergy()[VOICE.pad] : 0;
    const opacity = Math.round((playing ? 0.12 + pad * 0.88 : IDLE_OPACITY) * 100) / 100;
    const still =
      this.lens === this.paintedLens &&
      opacity === this.paintedOpacity &&
      // With the lens off the pointer position does not affect a single pixel.
      (this.lens === 0 || (pointer.x === this.paintedX && pointer.y === this.paintedY));
    if (still) {
      return;
    }
    this.paintedLens = this.lens;
    this.paintedOpacity = opacity;
    this.paintedX = pointer.x;
    this.paintedY = pointer.y;
    this.paint(ctx, opacity);
  }

  private paint(ctx: CanvasRenderingContext2D, opacity: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    // The whole lattice as a single path, stroked in one go.
    // Half-pixel offset: a 1px stroke on an integer coordinate straddles two rows and blurs.
    const grid = new Path2D();
    for (let x = GRID_OFFSET; x <= width; x += CELL) {
      this.line(grid, x + 0.5, 0.5, 0, 1, height);
    }
    for (let y = GRID_OFFSET; y <= height; y += CELL) {
      this.line(grid, 0.5, y + 0.5, 1, 0, width);
    }
    ctx.strokeStyle = `rgba(${LINE}, ${(LINE_ALPHA * opacity).toFixed(4)})`;
    ctx.stroke(grid);
    this.abyss(ctx);
  }

  /**
   * One grid line, from (x, y) along the unit direction (ux, uy) for `length` pixels, added to
   * `path`. Only the stretch that actually crosses the hole is sampled point by point; the rest
   * stays a single straight segment, so a line far from the cursor costs exactly what it did
   * before.
   */
  private line(
    path: Path2D,
    x: number,
    y: number,
    ux: number,
    uy: number,
    length: number,
  ): void {
    const pointer = this.pointer;
    const strength = this.lens;
    const endX = x + ux * length;
    const endY = y + uy * length;
    if (!pointer || strength <= 0.01) {
      path.moveTo(x, y);
      path.lineTo(endX, endY);
      return;
    }
    // Where the centre projects on the line, and how far it is from it.
    const at = (pointer.x - x) * ux + (pointer.y - y) * uy;
    const perpX = pointer.x - (x + ux * at);
    const perpY = pointer.y - (y + uy * at);
    const perp = Math.hypot(perpX, perpY);
    const span = perp < HOLE_RADIUS ? Math.sqrt(HOLE_RADIUS * HOLE_RADIUS - perp * perp) : 0;
    const from = Math.max(0, at - span);
    const to = Math.min(length, at + span);
    if (from >= to) {
      path.moveTo(x, y);
      path.lineTo(endX, endY);
      return;
    }
    path.moveTo(x, y);
    path.lineTo(x + ux * from, y + uy * from);
    let along = from;
    for (;;) {
      const sx = x + ux * along;
      const sy = y + uy * along;
      const towardX = pointer.x - sx;
      const towardY = pointer.y - sy;
      const distance = Math.hypot(towardX, towardY) || 0.001;
      const pull = (holePull(distance) * strength) / distance;
      path.lineTo(sx + towardX * pull, sy + towardY * pull);
      if (along >= to) {
        break;
      }
      along = Math.min(to, along + Math.max(SAMPLE, distance * SAMPLE_SPREAD));
    }
    path.lineTo(endX, endY);
  }

  /**
   * The abyss: the lattice is rubbed out on its way in, entirely inside the event horizon and
   * progressively out to {@link FADE_REACH}, so the bent lines just dim until they are gone.
   *
   * It erases with `destination-out`, where the gradient alpha only says how much of the grid to
   * take away: the lines fade towards transparent, never towards black, so the glows and the
   * page background behind this canvas are left alone. Nothing gets outlined, hence no ring.
   */
  private abyss(ctx: CanvasRenderingContext2D): void {
    const pointer = this.pointer;
    const lens = this.lens;
    if (!pointer || lens <= 0.01) {
      return;
    }
    // Scales with the fade-in, so the hole opens up instead of popping in.
    const reach = FADE_REACH * lens;
    const fade = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, reach);
    fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    // Nothing survives inside the horizon; from there outwards the erase eases off, so the void
    // has no edge to it.
    fade.addColorStop(EVENT_HORIZON / FADE_REACH, 'rgba(0, 0, 0, 1)');
    fade.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
    fade.addColorStop(0.75, 'rgba(0, 0, 0, 0.25)');
    fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, reach, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}
