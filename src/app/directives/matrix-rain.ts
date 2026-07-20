import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { AmbientAudio, VOICE } from '../services/ambient-audio';
import { prefersReducedMotion } from './motion';

// Katakana a mezza larghezza + cifre: il set "classico" della pioggia Matrix.
const GLYPHS =
  'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

// Cadenza base (rAF frame per "passo" di caduta): fattore 1 = look originale.
const STEP_FRAMES = 4;

// Alpha dei glifi a musica spenta: il valore storico, discreto e leggibile.
const IDLE_ALPHA = 'rgba(0, 229, 255, 0.22)';
// Con la musica la pioggia parte quasi invisibile e si accende sulla voce "air":
// il massimo resta sotto/attorno al valore originale, così non disturba la lettura.
const MIN_ALPHA = 0.04;
const MAX_ALPHA = 0.3;
// Palette precalcolata: evita di comporre una stringa rgba per colonna a ogni frame.
const STEPS = 24;
const GLYPH_ALPHAS = Array.from(
  { length: STEPS + 1 },
  (_, k) => `rgba(0, 229, 255, ${(MIN_ALPHA + (k / STEPS) * (MAX_ALPHA - MIN_ALPHA)).toFixed(3)})`,
);

/**
 * Pioggia di codice "Matrix" discreta su un <canvas> di sfondo. Ciano (accento del
 * sito), trasparente tra i glifi: griglia e bagliori restano visibili dietro. Gira
 * a ~30fps con devicePixelRatio limitato per restare leggera; la scia si crea con
 * un fade in destination-out (i glifi svaniscono verso il trasparente, non verso il
 * nero, così non copre lo sfondo).
 *
 * Audio-reattiva: è l'effetto della voce "air" di {@link AmbientAudio}. Con la
 * musica accesa parte quasi invisibile e si accende quanto più quella voce è
 * udibile (se la porti al minimo, la pioggia quasi sparisce); lo spettro dà grana
 * alle singole colonne e i bleep aggiungono lampi. Il massimo resta attorno al
 * valore storico per non disturbare la lettura. A musica ferma il look è quello
 * originale, identico a prima.
 *
 * Tutto sta dentro afterNextRender (niente canvas/animazioni durante il prerender in
 * Node) col cleanup registrato lì dentro; con prefers-reduced-motion non parte.
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
  // Fattore di velocità smussato e accumulatore per la cadenza continua.
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

    // La pioggia è la voce "air": se è al minimo rallenta e quasi sparisce.
    // Musica spenta -> fattore 1 = look originale. Smusso per non avere scatti.
    const energy = this.audio.voiceEnergy();
    const playing = this.audio.playing();
    const air = playing ? energy[VOICE.air] : 0;
    const signals = playing ? energy[VOICE.signals] : 0;
    const target = playing ? 0.45 + air * 1.1 : 1;
    this.speed += (target - this.speed) * 0.06;

    // Accumulatore: a fattore alto supero prima la soglia → disegno più spesso.
    this.stepAcc += this.speed;
    if (this.stepAcc < STEP_FRAMES) {
      return;
    }
    this.stepAcc -= STEP_FRAMES;

    const width = window.innerWidth;
    const height = window.innerHeight;
    // Sfuma i glifi del frame precedente verso il trasparente (scia).
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${String(this.fontSize)}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';

    // Musica spenta: colore storico uniforme, nessun costo aggiuntivo.
    if (!playing) {
      ctx.fillStyle = IDLE_ALPHA;
      this.rain(ctx, height, null, 0, 0);
      return;
    }
    // Con la musica la luminosità la detta "air"; lo spettro dà solo grana alle
    // colonne (da sinistra i bassi, a destra gli alti) e i bleep aggiungono lampi.
    // Tutto moltiplicato per air: a voce muta non si accende nulla.
    this.rain(ctx, height, this.audio.bands(), air, signals);
  }

  /** Disegna un passo di caduta. Con `bands` la luminosità varia per colonna. */
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
        // Cambio fillStyle solo quando serve davvero.
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
