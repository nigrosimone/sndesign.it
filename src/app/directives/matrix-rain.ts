import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { AmbientAudio, VOICE } from '../services/ambient-audio';
import { prefersReducedMotion } from './motion';

// Half-width katakana plus digits: the classic Matrix rain glyph set.
const GLYPHS =
  'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

// Base cadence (rAF frames per fall "step"): factor 1 = original look.
const STEP_FRAMES = 4;

// Glyph alpha with the music off: the original, discreet and readable value.
const IDLE_ALPHA = 'rgba(0, 229, 255, 0.22)';
// With music the rain starts nearly invisible and lights up with the "air" voice; the maximum
// stays around the original value so it never disturbs reading.
const MIN_ALPHA = 0.04;
const MAX_ALPHA = 0.3;
// Precomputed palette: avoids building an rgba string per column on every frame.
const STEPS = 24;
const GLYPH_ALPHAS = Array.from(
  { length: STEPS + 1 },
  (_, k) => `rgba(0, 229, 255, ${(MIN_ALPHA + (k / STEPS) * (MAX_ALPHA - MIN_ALPHA)).toFixed(3)})`,
);

/**
 * Discreet "Matrix" code rain on a background <canvas>. Cyan (the site accent) and transparent
 * between glyphs, so grid and glows stay visible behind. Runs at ~30fps with a capped
 * devicePixelRatio to stay cheap; the trail comes from a destination-out fade, so glyphs fade
 * towards transparent rather than black and never cover the background.
 *
 * Audio-reactive: it is the visual for the "air" voice of {@link AmbientAudio}. With music on it
 * starts nearly invisible and brightens with that voice, the spectrum adds per-column grain and
 * bleeps add flashes; the peak stays around the original alpha to keep text readable. With music
 * off the look is the original one.
 *
 * Everything lives inside afterNextRender (no canvas/animation during Node prerendering) with the
 * cleanup registered there; prefers-reduced-motion disables it entirely.
 */
@Directive({ selector: '[appMatrixRain]' })
export class MatrixRain {
  private readonly elementRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly audio = inject(AmbientAudio);
  private readonly canvas = this.elementRef.nativeElement;
  private readonly fontSize = 18;
  private ctx: CanvasRenderingContext2D | null = null;
  private columns = 0;
  private drops: number[] = [];
  private rafId = 0;
  // Smoothed speed factor and accumulator driving the continuous cadence.
  private speed = 1;
  private stepAcc = 0;

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
    // Setting width/height resets the context (transform included), so re-apply it after.
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

    // The rain is the "air" voice: at its minimum it slows down and nearly vanishes.
    // Music off -> factor 1 = original look. Smoothed to avoid jumps.
    const energy = this.audio.voiceEnergy();
    const playing = this.audio.playing();
    const air = playing ? energy[VOICE.air] : 0;
    const signals = playing ? energy[VOICE.signals] : 0;
    const target = playing ? 0.45 + air * 1.1 : 1;
    this.speed += (target - this.speed) * 0.06;

    // Accumulator: a higher factor crosses the threshold sooner, so drawing happens more often.
    this.stepAcc += this.speed;
    if (this.stepAcc < STEP_FRAMES) {
      return;
    }
    this.stepAcc -= STEP_FRAMES;

    const width = window.innerWidth;
    const height = window.innerHeight;
    // Fade the previous frame's glyphs towards transparent (the trail).
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${String(this.fontSize)}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';

    // Music off: uniform original colour, no extra cost.
    if (!playing) {
      ctx.fillStyle = IDLE_ALPHA;
      this.rain(ctx, height, null, 0, 0);
      return;
    }
    // With music, "air" drives brightness; the spectrum only adds per-column grain (lows on the
    // left, highs on the right) and bleeps add flashes. Everything is scaled by air, so a muted
    // voice lights up nothing.
    this.rain(ctx, height, this.audio.bands(), air, signals);
  }

  /** Draws one fall step; with `bands` the brightness varies per column. */
  private rain(
    ctx: CanvasRenderingContext2D,
    height: number,
    bands: readonly number[] | null,
    air: number,
    signals: number,
  ): void {
    const bandCount = bands?.length ?? 0;
    let fill = '';
    for (let i = 0; i < this.columns; i++) {
      if (bands && bandCount > 0) {
        const band = bands[Math.floor((i / this.columns) * bandCount)];
        const glow = air * (0.45 + band * 0.4) + signals * 0.3;
        const next = GLYPH_ALPHAS[Math.min(STEPS, Math.max(0, Math.round(glow * STEPS)))];
        // Only touch fillStyle when it actually changes.
        if (next !== fill) {
          fill = next;
          ctx.fillStyle = next;
        }
      }
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
