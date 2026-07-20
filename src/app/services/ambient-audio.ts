import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Motore audio generativo "dark ambient / cyberpunk". Ricrea, senza alcun file,
 * l'idea del vecchio sito in Flash: quattro basi sonore che si miscelano da sole
 * in una trama unica e sempre diversa, con la miscela personalizzabile dall'utente.
 *
 * Tutto è sintetizzato dal vivo con la Web Audio API (oscillatori + rumore filtrato
 * + LFO lenti), quindi ha peso zero sul bundle e variazione infinita. Le quattro
 * "voci":
 *   0. Drone    - sub-bass ronzante (fondamenta)
 *   1. Pad      - accordo minore che deriva lentamente (parte "musicale")
 *   2. Air      - rumore in banda passante che vaga (vento/atmosfera)
 *   3. Signals  - bleep digitali sparsi con eco (vita, carattere cyberpunk)
 *
 * La "miscelazione automatica" è un random-walk lento e indipendente sul livello di
 * ogni voce: ogni pochi secondi ognuna sceglie un nuovo target e ci scivola sopra,
 * così la combinazione non è mai identica. Il livello dal vivo è esposto in
 * {@link levels} (i cursori del mixer lo mostrano e si muovono da soli). Se l'utente
 * tocca una voce questa si "blocca" ({@link pinned}) sul valore scelto ed esce dalla
 * randomizzazione; {@link resetPins} le rimette tutte in automatico.
 *
 * L'animazione è pilotata da un loop requestAnimationFrame in JS: unica fonte di
 * verità che aggiorna sia il guadagno audio sia il segnale dei livelli, senza
 * dipendere dalla lettura di AudioParam.value. Il segnale visuale viene aggiornato
 * solo quando il pannello è aperto ({@link setVisualize}), per non sprecare
 * change-detection quando non serve.
 *
 * SSR-safe: nulla tocca il browser nel costruttore. L'AudioContext nasce lazy solo
 * al primo play (gesto utente, come impone la policy di autoplay). Le preferenze
 * sono persistite in localStorage e ripristinate dal componente in afterNextRender.
 */

/** Numero di voci (basi sonore). */
export const VOICE_COUNT = 4;

/** Bande dello spettro, usate solo come texture delle colonne della pioggia. */
export const BAND_COUNT = 32;

/** Chiavi i18n delle voci, nell'ordine del grafo audio. */
export const VOICE_KEYS = ['drone', 'pad', 'air', 'signals'] as const;

/** Indici delle voci: ogni voce pilota un effetto visivo preciso. */
export const VOICE = { drone: 0, pad: 1, air: 2, signals: 3 } as const;

interface Settings {
  enabled: boolean;
  master: number;
  movement: number;
  levels: number[];
  pinned: boolean[];
}

const STORAGE_KEY = 'sn-ambient-v1';
const DEFAULTS = {
  enabled: false,
  master: 0.55,
  movement: 0.55,
  levels: [0.75, 0.6, 0.45, 0.5],
};

// Random-walk: centro attorno a cui vaga il livello e ampiezza/durata governate
// dallo slider "movimento".
const WALK_CENTER = 0.62;
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const toNum = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
// Smoothstep: interpolazione morbida (niente scatti) tra due target del walk.
const ease = (p: number): number => p * p * (3 - 2 * p);
// Guadagno visivo: l'ambient è di per sé quieto, senza boost le bande resterebbero
// quasi piatte. Attacco rapido / rilascio lento = pulsazione "da visualizzatore".
const VISUAL_GAIN = 2.6;
const ATTACK = 0.5;
const RELEASE = 0.12;
// Decadimento per frame del lampo dei bleep: ~1s per tornare a zero a 60fps.
const SIGNAL_DECAY = 0.94;
// Durata del fade dei visual quando si ferma (ms): il loop resta vivo tanto quanto
// basta perché l'analizzatore veda l'audio spegnersi da solo.
const VISUAL_FADE_MS = 600;
// La2 come fondamentale; scala pentatonica minore (semitoni) per i bleep.
const ROOT = 110;
const PENTATONIC = [0, 3, 5, 7, 10];
const semi = (n: number): number => Math.pow(2, n / 12);

@Service()
export class AmbientAudio {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly playing = signal(false);
  readonly master = signal(DEFAULTS.master);
  readonly movement = signal(DEFAULTS.movement);
  /** Livello dal vivo di ogni voce (0..1): ciò che si sente e che i cursori mostrano. */
  readonly levels = signal<readonly number[]>([...DEFAULTS.levels]);
  /** Voci "bloccate": ferme al valore scelto ed escluse dalla randomizzazione. */
  readonly pinned = signal<readonly boolean[]>(Array<boolean>(VOICE_COUNT).fill(false));
  /** Vero se almeno una voce è bloccata (per mostrare il tasto "sblocca tutto"). */
  readonly hasPins = computed(() => this.pinned().some((p) => p));
  /** Vero appena il contesto audio è stato creato almeno una volta. */
  readonly ready = computed(() => this.ctx !== null);

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delaySend: DelayNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private readonly bandValues = Array<number>(BAND_COUNT).fill(0);
  /** Estremi (indici di bin) delle bande, spaziati in modo logaritmico. */
  private bandEdges: number[] = [];
  /** Quanto è udibile ogni voce (0..1): volume x livello, più il lampo dei bleep.
   *  È l'array che pilota i visual, una voce = un effetto. */
  private readonly voiceEnergyValues = Array<number>(VOICE_COUNT).fill(0);
  /** Lampo dei bleep: va a 1 quando parte un bleep e decade da solo. */
  private signalFlash = 0;
  /** Callback per frame per il ponte verso le CSS custom properties. */
  private frameHook: ((voices: readonly number[]) => void) | null = null;
  /** Fino a quando tenere vivo il loop dopo lo stop (fade dei visual). */
  private fadeUntil = 0;
  /** Un guadagno per voce: il suo gain è il livello dal vivo. */
  private voiceGains: GainNode[] = [];
  private nodes: AudioNode[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private rafId = 0;
  private stopped = false;
  /** Se true, il loop aggiorna anche il segnale dei livelli (pannello aperto). */
  private visualize = false;

  // Stato del random-walk per voce (in millisecondi sul clock di rAF/performance).
  private walkFrom = Array<number>(VOICE_COUNT).fill(WALK_CENTER);
  private walkTo = Array<number>(VOICE_COUNT).fill(WALK_CENTER);
  private walkStart = Array<number>(VOICE_COUNT).fill(0);
  private walkDur = Array<number>(VOICE_COUNT).fill(1);

  /** Avvia o ferma la riproduzione. Ritorna lo stato risultante. */
  async toggle(): Promise<boolean> {
    if (this.playing()) {
      this.stop();
      return false;
    }
    await this.start();
    return this.playing();
  }

  /** Crea (se serve) il grafo audio e avvia. Deve girare da un gesto utente. */
  async start(): Promise<void> {
    if (!this.isBrowser || this.playing()) {
      return;
    }
    // Tipizzato come opzionale: su vecchi Safari serve il prefisso webkit, e i
    // tipi DOM danno AudioContext come sempre presente (qui invece va verificato).
    const scope = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = scope.AudioContext ?? scope.webkitAudioContext;
    if (!Ctx) {
      return;
    }
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.build(this.ctx);
    }
    // Su Safari/iOS il contesto nasce "suspended": va ripreso dentro il gesto.
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ripresa negata: lasciamo lo stato com'è */
      }
    }
    this.stopped = false;
    this.applyMaster();
    this.seedWalks();
    this.scheduleSignals();
    this.playing.set(true);
    this.startLoop();
    this.persist();
  }

  /** Ferma la riproduzione e sospende il contesto (il grafo resta pronto). */
  stop(): void {
    this.stopped = true;
    for (const t of this.timers) {
      clearTimeout(t);
    }
    this.timers = [];
    // Il loop NON viene ucciso qui: resta vivo un attimo così i visual seguono
    // l'audio che sfuma, poi si spegne da solo (vedi animate).
    this.fadeUntil = this.now() + VISUAL_FADE_MS;
    if (this.masterGain && this.ctx) {
      // Fade-out breve per non "cliccare", poi sospende.
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.25);
      const ctx = this.ctx;
      this.timers.push(
        setTimeout(() => {
          if (this.stopped && ctx.state === 'running') {
            void ctx.suspend();
          }
        }, 300),
      );
    }
    this.playing.set(false);
    this.persist();
  }

  setMaster(v: number): void {
    this.master.set(clamp01(v));
    this.applyMaster();
    this.persist();
  }

  setMovement(v: number): void {
    this.movement.set(clamp01(v));
    this.persist();
  }

  /** Imposta il livello di una voce e la blocca (esce dalla randomizzazione). */
  setLevel(index: number, v: number): void {
    if (index < 0 || index >= VOICE_COUNT) {
      return;
    }
    const value = clamp01(v);
    const levels = [...this.levels()];
    levels[index] = value;
    this.levels.set(levels);
    this.setPinned(index, true);
    this.applyVoiceGain(index, value);
    this.persist();
  }

  /** Blocca una voce sul livello attuale senza cambiarlo. */
  pin(index: number): void {
    if (index < 0 || index >= VOICE_COUNT || this.pinned()[index]) {
      return;
    }
    this.setPinned(index, true);
    this.persist();
  }

  /** Alterna blocco/automatico per una voce. */
  togglePin(index: number): void {
    if (index < 0 || index >= VOICE_COUNT) {
      return;
    }
    if (this.pinned()[index]) {
      this.setPinned(index, false);
      this.seedWalk(index, this.levels()[index]);
    } else {
      this.setPinned(index, true);
    }
    this.persist();
  }

  /** Sblocca tutte le voci: tornano tutte in automatico. */
  resetPins(): void {
    if (!this.hasPins()) {
      return;
    }
    this.pinned.set(Array<boolean>(VOICE_COUNT).fill(false));
    for (let i = 0; i < VOICE_COUNT; i++) {
      this.seedWalk(i, this.levels()[i]);
    }
    this.persist();
  }

  /** Quanto è udibile ogni voce adesso (0..1), nell'ordine di {@link VOICE}.
   *  È il driver dei visual: una voce = un effetto, e a voce muta l'effetto sparisce.
   *  Non è un signal: lo legge un loop rAF esterno, quindi zero change-detection. */
  voiceEnergy(): readonly number[] {
    return this.voiceEnergyValues;
  }

  /** Le {@link BAND_COUNT} bande dello spettro (0..1): texture delle colonne. */
  bands(): readonly number[] {
    return this.bandValues;
  }

  /** Registra un callback chiamato a ogni frame del loop audio (uno solo).
   *  Lo usa il ponte verso le CSS custom properties: così non serve un altro rAF. */
  onFrame(cb: ((voices: readonly number[]) => void) | null): void {
    this.frameHook = cb;
  }

  /** Attiva/disattiva l'aggiornamento del segnale dei livelli (pannello aperto). */
  setVisualize(on: boolean): void {
    this.visualize = on;
    if (on) {
      // Riallinea subito i cursori al livello corrente.
      this.levels.set([...this.levels()]);
    }
  }

  /** Legge le preferenze salvate (solo browser). Chiamare da afterNextRender. */
  restore(): Settings | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      // localStorage è input non fidato: parso in modo difensivo (valori unknown).
      const parsed = JSON.parse(raw) as {
        enabled?: unknown;
        master?: unknown;
        movement?: unknown;
        levels?: unknown;
        pinned?: unknown;
      };
      const rawLevels: unknown[] = Array.isArray(parsed.levels) ? parsed.levels : [];
      const rawPinned: unknown[] = Array.isArray(parsed.pinned) ? parsed.pinned : [];
      const master = clamp01(toNum(parsed.master, DEFAULTS.master));
      const movement = clamp01(toNum(parsed.movement, DEFAULTS.movement));
      const levels = Array.from({ length: VOICE_COUNT }, (_, i) =>
        clamp01(toNum(rawLevels[i], DEFAULTS.levels[i])),
      );
      const pinned = Array.from({ length: VOICE_COUNT }, (_, i) => rawPinned[i] === true);
      this.master.set(master);
      this.movement.set(movement);
      this.levels.set(levels);
      this.pinned.set(pinned);
      return { enabled: parsed.enabled === true, master, movement, levels, pinned };
    } catch {
      return null;
    }
  }

  // --- Random-walk (loop rAF) ------------------------------------------------

  private startLoop(): void {
    if (this.rafId || typeof requestAnimationFrame !== 'function') {
      return;
    }
    this.rafId = requestAnimationFrame(this.animate);
  }

  /** Punto della camminata casuale scelto in base al "movimento". */
  private pickTarget(): number {
    const half = this.movement() * 0.5;
    return clamp01(WALK_CENTER + (Math.random() * 2 - 1) * half);
  }

  private seedWalk(index: number, from: number): void {
    this.walkFrom[index] = from;
    this.walkTo[index] = this.pickTarget();
    this.walkStart[index] = this.now();
    this.walkDur[index] = (7 - this.movement() * 3.5 + Math.random() * 4) * 1000;
  }

  private seedWalks(): void {
    const levels = this.levels();
    for (let i = 0; i < VOICE_COUNT; i++) {
      this.seedWalk(i, levels[i]);
    }
  }

  /** Estremi delle bande spaziati in modo logaritmico: più risoluzione sui bassi,
   *  dove vive questa musica (come le barre di un equalizzatore). */
  private computeBandEdges(binCount: number): void {
    const minBin = 1; // salto il bin 0 (continua)
    const maxBin = Math.max(minBin + BAND_COUNT, Math.floor(binCount * 0.5)); // ~11 kHz
    this.bandEdges = Array.from({ length: BAND_COUNT + 1 }, (_, k) =>
      Math.round(minBin * Math.pow(maxBin / minBin, k / BAND_COUNT)),
    );
  }

  /** Campiona lo spettro: serve solo a dare "grana" alle colonne della pioggia. */
  private sampleBands(): void {
    const analyser = this.analyser;
    const data = this.analyserData;
    if (!analyser || !data || this.bandEdges.length === 0) {
      return;
    }
    analyser.getByteFrequencyData(data);
    for (let k = 0; k < BAND_COUNT; k++) {
      const lo = this.bandEdges[k];
      const hi = Math.max(lo + 1, this.bandEdges[k + 1]);
      let sum = 0;
      for (let b = lo; b < hi; b++) {
        sum += data[b];
      }
      const next = clamp01((sum / (hi - lo) / 255) * VISUAL_GAIN);
      const cur = this.bandValues[k];
      this.bandValues[k] = cur + (next - cur) * (next > cur ? ATTACK : RELEASE);
    }
  }

  /**
   * Quanto è udibile ogni voce adesso. Non lo deduco da una FFT: il suono lo
   * sintetizzo io, quindi lo so con esattezza (volume x livello della voce). È lo
   * stesso valore che vedi muoversi sulle barre del mixer, quindi il legame
   * "questa voce anima quell'effetto" resta leggibile, e a voce muta va a zero.
   * La voce dei bleep è discontinua: lì conta il lampo, che decade dopo ogni bleep.
   *
   * @param fade 1 mentre suona, poi scende a 0 durante lo spegnimento.
   */
  private sampleVoiceEnergy(fade: number): void {
    const master = this.master();
    const levels = this.levels();
    this.signalFlash *= SIGNAL_DECAY;
    for (let i = 0; i < VOICE_COUNT; i++) {
      const audible = master * levels[i] * fade;
      const next = clamp01(i === VOICE.signals ? audible * this.signalFlash : audible);
      const cur = this.voiceEnergyValues[i];
      this.voiceEnergyValues[i] = cur + (next - cur) * (next > cur ? ATTACK : RELEASE);
    }
  }

  private zeroVisuals(): void {
    this.bandValues.fill(0);
    this.voiceEnergyValues.fill(0);
    this.signalFlash = 0;
  }

  /** Un frame: aggiorna i visual, fa avanzare il walk delle voci non bloccate e
   *  aggiorna i gain. Dopo lo stop resta vivo per {@link VISUAL_FADE_MS}, così i
   *  visual si spengono seguendo l'audio che sfuma davvero (niente scatto). */
  private animate = (nowMs: number): void => {
    if (!this.ctx || (this.stopped && nowMs > this.fadeUntil)) {
      this.rafId = 0;
      this.zeroVisuals();
      this.frameHook?.(this.voiceEnergyValues);
      return;
    }
    // In spegnimento il fade va da 1 a 0: i visual seguono l'audio che sfuma.
    const fade = this.stopped ? clamp01((this.fadeUntil - nowMs) / VISUAL_FADE_MS) : 1;
    this.sampleBands();
    this.sampleVoiceEnergy(fade);
    this.frameHook?.(this.voiceEnergyValues);
    if (this.stopped) {
      // In fade: niente walk, solo i visual che si spengono.
      this.rafId = requestAnimationFrame(this.animate);
      return;
    }
    const pinned = this.pinned();
    const levels = [...this.levels()];
    let changed = false;
    for (let i = 0; i < VOICE_COUNT; i++) {
      if (pinned[i]) {
        continue;
      }
      let p = (nowMs - this.walkStart[i]) / this.walkDur[i];
      if (p >= 1) {
        // Segmento concluso: riparto dal target raggiunto verso uno nuovo.
        this.seedWalk(i, this.walkTo[i]);
        this.walkStart[i] = nowMs;
        p = 0;
      }
      const level = this.walkFrom[i] + (this.walkTo[i] - this.walkFrom[i]) * ease(p);
      levels[i] = level;
      this.applyVoiceGain(i, level, true);
      changed = true;
    }
    if (this.visualize && changed) {
      this.levels.set(levels);
    }
    this.rafId = requestAnimationFrame(this.animate);
  };

  // --- Costruzione del grafo -------------------------------------------------

  private build(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Analizzatore per i visual audio-reattivi: legge lo spettro del mix in uscita.
    // Basta riceverlo in ingresso, non serve collegarlo alla destinazione.
    // 1024 -> 512 bin da ~43 Hz: abbastanza fine da separare drone, pad e bleep.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    master.connect(analyser);
    this.analyser = analyser;
    this.analyserData = new Uint8Array(analyser.frequencyBinCount);
    this.computeBandEdges(analyser.frequencyBinCount);

    // Riverbero economico: convolver con impulso sintetico (coda di rumore).
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulseResponse(ctx, 2.6, 2.2);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.28;
    master.connect(reverb);
    reverb.connect(reverbWet);
    reverbWet.connect(ctx.destination);
    this.nodes.push(reverb, reverbWet);

    // Eco per i bleep (send condiviso): delay con feedback.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.375;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.9;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(master);
    this.delaySend = delay;
    this.nodes.push(delay, feedback, delayWet);

    const levels = this.levels();
    for (let i = 0; i < VOICE_COUNT; i++) {
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = levels[i];
      voiceGain.connect(master);
      this.voiceGains[i] = voiceGain;
    }

    this.buildDrone(ctx, this.voiceGains[0]);
    this.buildPad(ctx, this.voiceGains[1]);
    this.buildAir(ctx, this.voiceGains[2]);
    // La voce "signals" (indice 3) è event-based: nessuna sorgente continua.
  }

  /** Voce 0 - Drone: sub-bass con quinta, lowpass che respira. */
  private buildDrone(ctx: AudioContext, out: GainNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.Q.value = 4;
    filter.connect(out);
    this.slowLfo(ctx, 0.05, 90, 220, filter.frequency);

    const freqs = [ROOT / 2, (ROOT / 2) * 1.5, ROOT]; // A1, E2, A2
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'sawtooth' : 'sine';
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.12 : 0.5;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      this.nodes.push(osc, g);
    });
    this.nodes.push(filter);
  }

  /** Voce 1 - Pad: accordo minore (fondamentale, terza minore, quinta, ottava). */
  private buildPad(ctx: AudioContext, out: GainNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 2;
    filter.connect(out);
    this.slowLfo(ctx, 0.07, 400, 900, filter.frequency);

    const chord = [ROOT, ROOT * semi(3), ROOT * semi(7), ROOT * 2];
    chord.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 3 ? 'triangle' : 'sawtooth';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 3 ? 0.08 : 0.14;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      // Deriva lenta del detune: l'accordo "vive".
      this.slowLfo(ctx, 0.03 + i * 0.017, -6, 6, osc.detune);
      this.nodes.push(osc, g);
    });
    this.nodes.push(filter);
  }

  /** Voce 2 - Air: rumore in banda passante il cui centro vaga (vento digitale). */
  private buildAir(ctx: AudioContext, out: GainNode): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 4);
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    noise.connect(filter);
    filter.connect(g);
    g.connect(out);
    this.slowLfo(ctx, 0.06, 300, 1900, filter.frequency);
    noise.start();
    this.nodes.push(noise, filter, g);
  }

  /** Voce 3 - Signals: bleep sparsi su scala pentatonica, con eco. */
  private scheduleSignals(): void {
    const tick = (): void => {
      const ctx = this.ctx;
      if (this.stopped || !ctx) {
        return;
      }
      this.blip(ctx);
      // Più "movimento" -> bleep un po' più frequenti.
      const gap = 5.5 - this.movement() * 3 + Math.random() * 3;
      this.timers.push(setTimeout(tick, gap * 1000));
    };
    this.timers.push(setTimeout(tick, 1500));
  }

  private blip(ctx: AudioContext): void {
    // La voce 3 quasi muta: niente bleep (il suo livello ne regola il volume).
    if (this.levels()[VOICE.signals] < 0.02) {
      return;
    }
    // Accende il lampo visivo: decade da solo, così i bleep si "vedono".
    this.signalFlash = 1;
    const step = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    const octave = 1 + Math.floor(Math.random() * 3); // ottave sopra la fondamentale
    const freq = ROOT * Math.pow(2, octave) * semi(step);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = Math.random() < 0.5 ? 'triangle' : 'sine';
    osc.frequency.value = freq;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 6;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.28, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0005, now + 1.1);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.voiceGains[VOICE.signals]);
    if (this.delaySend) {
      env.connect(this.delaySend);
    }
    osc.start(now);
    osc.stop(now + 1.2);
    osc.onended = (): void => {
      osc.disconnect();
      filter.disconnect();
      env.disconnect();
    };
  }

  // --- Automazioni di base ---------------------------------------------------

  /** LFO lento (seno) mappato su [min,max] verso un AudioParam. */
  private slowLfo(
    ctx: AudioContext,
    rateHz: number,
    min: number,
    max: number,
    target: AudioParam,
  ): void {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rateHz;
    const depth = ctx.createGain();
    depth.gain.value = (max - min) / 2;
    target.value = (max + min) / 2;
    lfo.connect(depth);
    depth.connect(target);
    lfo.start();
    this.nodes.push(lfo, depth);
  }

  // --- Applicazione parametri ------------------------------------------------

  private applyMaster(): void {
    if (!this.masterGain || !this.ctx || this.stopped) {
      return;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(this.master(), now + 0.2);
  }

  /** Scrive il livello nel gain della voce. Dal loop: assegnazione diretta (passi
   * minuscoli); da un'interazione: breve rampa anti-click. */
  private applyVoiceGain(index: number, value: number, fromLoop = false): void {
    const g = this.voiceGains[index];
    if (!this.ctx) {
      return;
    }
    if (fromLoop) {
      g.gain.value = value;
      return;
    }
    const now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(value, now + 0.08);
  }

  private setPinned(index: number, value: boolean): void {
    const next = [...this.pinned()];
    next[index] = value;
    this.pinned.set(next);
  }

  /** Clock condiviso col loop rAF (millisecondi). */
  private now(): number {
    return typeof performance === 'object' ? performance.now() : 0;
  }

  // --- Buffer sintetici ------------------------------------------------------

  /** Rumore rosa-ish (rumore bianco filtrato passa-basso a un polo). */
  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.98 * last + 0.02 * white;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  /** Impulso di riverbero: coda di rumore con decadimento esponenziale. */
  private impulseResponse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  // --- Persistenza -----------------------------------------------------------

  private persist(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const data: Settings = {
        enabled: this.playing(),
        master: this.master(),
        movement: this.movement(),
        levels: [...this.levels()],
        pinned: [...this.pinned()],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage pieno o non disponibile: ignoriamo */
    }
  }
}
