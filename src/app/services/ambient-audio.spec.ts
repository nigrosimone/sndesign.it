import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientAudio, BAND_COUNT, VOICE_COUNT } from './ambient-audio';

const STORAGE_KEY = 'sn-ambient-v1';

// Minimal Web Audio API mock (jsdom does not implement it).
class FakeParam {
  value = 0;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn((v: number) => {
    this.value = v;
  });
  exponentialRampToValueAtTime = vi.fn();
}

class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  Q = new FakeParam();
  delayTime = new FakeParam();
  type = 'sine';
  loop = false;
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAnalyser {
  fftSize = 2048;
  smoothingTimeConstant = 0;
  frequencyBinCount = 128;
  connect = vi.fn();
  disconnect = vi.fn();
  getByteFrequencyData = vi.fn();
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = 'suspended';
  destination = new FakeNode();
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  createGain = (): FakeNode => new FakeNode();
  createOscillator = (): FakeNode => new FakeNode();
  createBiquadFilter = (): FakeNode => new FakeNode();
  createConvolver = (): FakeNode => new FakeNode();
  createDelay = (): FakeNode => new FakeNode();
  createBufferSource = (): FakeNode => new FakeNode();
  createAnalyser = (): FakeAnalyser => new FakeAnalyser();
  createBuffer = (channels: number, length: number): { getChannelData: () => Float32Array } => ({
    getChannelData: () => new Float32Array(length),
  });
}

// The Angular builder test environment does not expose localStorage: mock it in
// memory (the service guards it with try/catch anyway).
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length(): number {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

function readStore(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
}

describe('AmbientAudio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('localStorage', fakeStorage());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('is idle before start()', () => {
    const audio = TestBed.inject(AmbientAudio);
    expect(audio.playing()).toBe(false);
    expect(audio.ready()).toBe(false);
  });

  it('builds the graph and plays on start()', async () => {
    const audio = TestBed.inject(AmbientAudio);
    await audio.start();
    expect(audio.playing()).toBe(true);
    expect(audio.ready()).toBe(true);
  });

  it('toggle() flips playback and persists the state', async () => {
    const audio = TestBed.inject(AmbientAudio);
    expect(await audio.toggle()).toBe(true);
    expect(audio.playing()).toBe(true);
    expect(readStore()['enabled']).toBe(true);

    expect(await audio.toggle()).toBe(false);
    expect(audio.playing()).toBe(false);
    expect(readStore()['enabled']).toBe(false);
  });

  it('clamps and stores master and movement', () => {
    const audio = TestBed.inject(AmbientAudio);
    audio.setMaster(2);
    audio.setMovement(-1);

    expect(audio.master()).toBe(1);
    expect(audio.movement()).toBe(0);

    const saved = readStore();
    expect(saved['master']).toBe(1);
    expect(saved['movement']).toBe(0);
  });

  it('setLevel() clamps, pins the voice and persists', () => {
    const audio = TestBed.inject(AmbientAudio);
    audio.setLevel(0, 2);
    expect(audio.levels()[0]).toBe(1);
    expect(audio.pinned()[0]).toBe(true);
    expect(audio.hasPins()).toBe(true);

    const saved = readStore();
    expect((saved['levels'] as number[])[0]).toBe(1);
    expect((saved['pinned'] as boolean[])[0]).toBe(true);
  });

  it('togglePin() and resetPins() manage the locked voices', () => {
    const audio = TestBed.inject(AmbientAudio);
    audio.togglePin(1);
    expect(audio.pinned()[1]).toBe(true);
    audio.togglePin(1);
    expect(audio.pinned()[1]).toBe(false);

    audio.setLevel(0, 0.4);
    audio.setLevel(2, 0.6);
    expect(audio.hasPins()).toBe(true);
    audio.resetPins();
    expect(audio.hasPins()).toBe(false);
    expect(audio.pinned()).toEqual([false, false, false, false]);
  });

  it('ignores out-of-range voice indices', () => {
    const audio = TestBed.inject(AmbientAudio);
    const before = audio.levels();
    audio.setLevel(99, 0.5);
    audio.setLevel(-1, 0.5);
    audio.togglePin(99);
    expect(audio.levels()).toBe(before);
    expect(audio.hasPins()).toBe(false);
  });

  it('restore() reads persisted settings into the signals', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: true,
        master: 0.2,
        movement: 0.9,
        levels: [0.1, 0.2, 0.3, 0.4],
        pinned: [true, false, true, false],
      }),
    );
    const audio = TestBed.inject(AmbientAudio);
    const settings = audio.restore();

    expect(settings?.enabled).toBe(true);
    expect(audio.master()).toBe(0.2);
    expect(audio.movement()).toBe(0.9);
    expect(audio.levels()).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(audio.pinned()).toEqual([true, false, true, false]);
  });

  it('restore() returns null when nothing is stored', () => {
    const audio = TestBed.inject(AmbientAudio);
    expect(audio.restore()).toBeNull();
  });

  it('stop() ends playback', async () => {
    const audio = TestBed.inject(AmbientAudio);
    await audio.start();
    audio.stop();
    expect(audio.playing()).toBe(false);
  });

  it('reports no visual energy at all while idle', () => {
    const audio = TestBed.inject(AmbientAudio);
    expect(audio.voiceEnergy()).toHaveLength(VOICE_COUNT);
    expect(audio.voiceEnergy().every((v) => v === 0)).toBe(true);
    expect(audio.bands()).toHaveLength(BAND_COUNT);
    expect(audio.bands().every((b) => b === 0)).toBe(true);
  });
});
