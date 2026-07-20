import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Number of sound voices. */
export const VOICE_COUNT = 4;

/** Spectrum bands, used only as texture for the rain columns. */
export const BAND_COUNT = 32;

/** Voice i18n keys, in audio-graph order. */
export const VOICE_KEYS = ['drone', 'pad', 'air', 'signals'] as const;

/** Voice indexes: each voice drives one visual effect. */
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

/** Center the random walk drifts around; the "movement" slider sets its span. */
const WALK_CENTER = 0.62;
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const toNum = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
/** Smoothstep, so walk segments join without a kink. */
const ease = (p: number): number => p * p * (3 - 2 * p);
// Ambient material is quiet: without a boost the bands would stay almost flat.
// Fast attack / slow release gives the usual visualizer pulse.
const VISUAL_GAIN = 2.6;
const ATTACK = 0.5;
const RELEASE = 0.12;
/** Per-frame decay of the bleep flash: ~1s back to zero at 60fps. */
const SIGNAL_DECAY = 0.94;
// Visual fade after stop (ms): the loop stays alive just long enough to follow
// the audio fading out.
const VISUAL_FADE_MS = 600;
// A2 as fundamental, minor pentatonic (semitones) for the bleeps.
const ROOT = 110;
const PENTATONIC = [0, 3, 5, 7, 10];
const semi = (n: number): number => Math.pow(2, n / 12);

/**
 * File-less generative dark-ambient engine: drone, pad, air and signals are
 * synthesized live with the Web Audio API and mixed by an independent slow random
 * walk per voice, so the texture is never the same twice. Touching a voice pins it
 * to the chosen level and takes it out of the randomization.
 *
 * SSR-safe: the AudioContext is created lazily on the first play, which must happen
 * inside a user gesture (autoplay policy).
 */
@Service()
export class AmbientAudio {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly playing = signal(false);
  readonly master = signal(DEFAULTS.master);
  readonly movement = signal(DEFAULTS.movement);
  /** Live level of each voice (0..1): what you hear and what the sliders show. */
  readonly levels = signal<readonly number[]>([...DEFAULTS.levels]);
  /** Pinned voices: held at the chosen level, excluded from the randomization. */
  readonly pinned = signal<readonly boolean[]>(Array<boolean>(VOICE_COUNT).fill(false));
  readonly hasPins = computed(() => this.pinned().some((p) => p));
  /** True once the audio context has been created at least once. */
  readonly ready = computed(() => this.ctx !== null);

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delaySend: DelayNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private readonly bandValues = Array<number>(BAND_COUNT).fill(0);
  /** Band boundaries (bin indexes), logarithmically spaced. */
  private bandEdges: number[] = [];
  /** How audible each voice is (0..1): master x level, plus the bleep flash. */
  private readonly voiceEnergyValues = Array<number>(VOICE_COUNT).fill(0);
  /** Bleep flash: jumps to 1 on each bleep, then decays. */
  private signalFlash = 0;
  private frameHook: ((voices: readonly number[]) => void) | null = null;
  /** Deadline until which the loop stays alive after stop (visual fade). */
  private fadeUntil = 0;
  private voiceGains: GainNode[] = [];
  private nodes: AudioNode[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private rafId = 0;
  private stopped = false;
  /** When true the loop also updates the levels signal (mixer panel open). */
  private visualize = false;

  // Per-voice random-walk state (milliseconds on the rAF/performance clock).
  private walkFrom = Array<number>(VOICE_COUNT).fill(WALK_CENTER);
  private walkTo = Array<number>(VOICE_COUNT).fill(WALK_CENTER);
  private walkStart = Array<number>(VOICE_COUNT).fill(0);
  private walkDur = Array<number>(VOICE_COUNT).fill(1);

  /** Starts or stops playback; returns the resulting state. */
  async toggle(): Promise<boolean> {
    if (this.playing()) {
      this.stop();
      return false;
    }
    await this.start();
    return this.playing();
  }

  /** Builds the audio graph if needed and starts. Must run from a user gesture. */
  async start(): Promise<void> {
    if (!this.isBrowser || this.playing()) {
      return;
    }
    // Typed as optional: old Safari needs the webkit prefix, and the DOM types
    // declare AudioContext as always present.
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
    // On Safari/iOS the context starts suspended and must be resumed in the gesture.
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* resume denied: leave the state as is */
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

  /** Stops playback and suspends the context; the graph stays ready. */
  stop(): void {
    this.stopped = true;
    for (const t of this.timers) {
      clearTimeout(t);
    }
    this.timers = [];
    // The loop is not killed here: it stays alive briefly so the visuals follow the
    // audio fading out, then ends by itself (see animate).
    this.fadeUntil = this.now() + VISUAL_FADE_MS;
    if (this.masterGain && this.ctx) {
      // Short fade-out to avoid a click, then suspend.
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

  /** Sets a voice level and pins it, taking it out of the randomization. */
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

  /** Pins a voice at its current level, without changing it. */
  pin(index: number): void {
    if (index < 0 || index >= VOICE_COUNT || this.pinned()[index]) {
      return;
    }
    this.setPinned(index, true);
    this.persist();
  }

  /** Toggles a voice between pinned and automatic. */
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

  /** Unpins every voice, putting them all back on automatic. */
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

  /** How audible each voice is right now (0..1), in {@link VOICE} order: one voice
   *  drives one visual effect. Not a signal — an external rAF loop reads it, so it
   *  costs no change detection. */
  voiceEnergy(): readonly number[] {
    return this.voiceEnergyValues;
  }

  /** The {@link BAND_COUNT} spectrum bands (0..1), used as column texture. */
  bands(): readonly number[] {
    return this.bandValues;
  }

  /** Registers the single per-frame callback used by the CSS custom property
   *  bridge, so it does not need its own rAF loop. */
  onFrame(cb: ((voices: readonly number[]) => void) | null): void {
    this.frameHook = cb;
  }

  /** Enables updating the levels signal, i.e. while the mixer panel is open. */
  setVisualize(on: boolean): void {
    this.visualize = on;
    if (on) {
      // Realign the sliders with the current level right away.
      this.levels.set([...this.levels()]);
    }
  }

  /** Reads the saved preferences (browser only). Call from afterNextRender. */
  restore(): Settings | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      // localStorage is untrusted input: parse defensively.
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

  private startLoop(): void {
    if (this.rafId || typeof requestAnimationFrame !== 'function') {
      return;
    }
    this.rafId = requestAnimationFrame(this.animate);
  }

  /** Next random-walk target, with a span set by the "movement" slider. */
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

  /** Logarithmically spaced band edges: more resolution on the low end, where this
   *  music lives (like the bars of an equalizer). */
  private computeBandEdges(binCount: number): void {
    const minBin = 1; // skip bin 0 (DC)
    const maxBin = Math.max(minBin + BAND_COUNT, Math.floor(binCount * 0.5)); // ~11 kHz
    this.bandEdges = Array.from({ length: BAND_COUNT + 1 }, (_, k) =>
      Math.round(minBin * Math.pow(maxBin / minBin, k / BAND_COUNT)),
    );
  }

  /** Samples the spectrum; only used to add grain to the rain columns. */
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
   * Per-voice audibility, derived from master x voice level rather than from the
   * FFT: the sound is synthesized here, so the exact value is already known and it
   * matches what the mixer bars show. The signals voice is discontinuous, so there
   * the flash is what counts.
   *
   * @param fade 1 while playing, ramping to 0 while stopping.
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

  /** One frame: refreshes the visuals, advances the walk of the unpinned voices and
   *  writes their gains. After stop it keeps running for {@link VISUAL_FADE_MS} so
   *  the visuals fade out along with the audio. */
  private animate = (nowMs: number): void => {
    if (!this.ctx || (this.stopped && nowMs > this.fadeUntil)) {
      this.rafId = 0;
      this.zeroVisuals();
      this.frameHook?.(this.voiceEnergyValues);
      return;
    }
    const fade = this.stopped ? clamp01((this.fadeUntil - nowMs) / VISUAL_FADE_MS) : 1;
    this.sampleBands();
    this.sampleVoiceEnergy(fade);
    this.frameHook?.(this.voiceEnergyValues);
    if (this.stopped) {
      // While fading: no walk, just the visuals dying down.
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
        // Segment done: restart from the target just reached towards a new one.
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

  private build(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Analyser for the audio-reactive visuals: it only needs the mix as input, not a
    // connection to the destination. 1024 -> 512 bins of ~43 Hz, fine enough to tell
    // drone, pad and bleeps apart.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    master.connect(analyser);
    this.analyser = analyser;
    this.analyserData = new Uint8Array(analyser.frequencyBinCount);
    this.computeBandEdges(analyser.frequencyBinCount);

    // Cheap reverb: convolver fed a synthetic noise-tail impulse.
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulseResponse(ctx, 2.6, 2.2);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.28;
    master.connect(reverb);
    reverb.connect(reverbWet);
    reverbWet.connect(ctx.destination);
    this.nodes.push(reverb, reverbWet);

    // Shared echo send for the bleeps: delay with feedback.
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
    // The signals voice is event-based: no continuous source.
  }

  /** Voice 0 - Drone: sub-bass plus fifth, through a breathing lowpass. */
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

  /** Voice 1 - Pad: minor chord (root, minor third, fifth, octave). */
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
      // Slow detune drift, so the chord keeps moving.
      this.slowLfo(ctx, 0.03 + i * 0.017, -6, 6, osc.detune);
      this.nodes.push(osc, g);
    });
    this.nodes.push(filter);
  }

  /** Voice 2 - Air: bandpassed noise whose center drifts (digital wind). */
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

  /** Voice 3 - Signals: sparse pentatonic bleeps with echo. */
  private scheduleSignals(): void {
    const tick = (): void => {
      const ctx = this.ctx;
      if (this.stopped || !ctx) {
        return;
      }
      this.blip(ctx);
      // More "movement" -> slightly more frequent bleeps.
      const gap = 5.5 - this.movement() * 3 + Math.random() * 3;
      this.timers.push(setTimeout(tick, gap * 1000));
    };
    this.timers.push(setTimeout(tick, 1500));
  }

  private blip(ctx: AudioContext): void {
    // Voice nearly muted: skip the bleep entirely.
    if (this.levels()[VOICE.signals] < 0.02) {
      return;
    }
    this.signalFlash = 1;
    const step = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    const octave = 1 + Math.floor(Math.random() * 3); // octaves above the root
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

  /** Slow sine LFO mapped onto [min,max] and routed to an AudioParam. */
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

  private applyMaster(): void {
    if (!this.masterGain || !this.ctx || this.stopped) {
      return;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(this.master(), now + 0.2);
  }

  /** Writes the level into the voice gain: direct assignment from the loop (tiny
   * steps), short anti-click ramp when it comes from an interaction. */
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

  /** Clock shared with the rAF loop (milliseconds). */
  private now(): number {
    return typeof performance === 'object' ? performance.now() : 0;
  }

  /** Pink-ish noise (white noise through a one-pole lowpass). */
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

  /** Reverb impulse: noise tail with exponential decay. */
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
      /* storage full or unavailable: ignore */
    }
  }
}
