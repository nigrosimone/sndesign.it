import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientAudio } from './ambient-audio';
import { AudioVisuals } from './audio-visuals';

type Hook = (voices: readonly number[]) => void;

/** Stub di AmbientAudio: cattura il callback per frame e lo lascia invocare a mano. */
class AudioStub {
  hook: Hook | null = null;
  onFrame(cb: Hook | null): void {
    this.hook = cb;
  }
}

const SILENT = [0, 0, 0, 0];

function setup(): { visuals: AudioVisuals; audio: AudioStub; root: HTMLElement } {
  const audio = new AudioStub();
  TestBed.configureTestingModule({
    providers: [{ provide: AmbientAudio, useValue: audio }],
  });
  return {
    visuals: TestBed.inject(AudioVisuals),
    audio,
    root: TestBed.inject(DOCUMENT).documentElement,
  };
}

describe('AudioVisuals', () => {
  let root: HTMLElement | null = null;

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const name of ['--audio-drone', '--audio-pad', '--audio-air', '--audio-signals']) {
      root?.style.removeProperty(name);
    }
    root?.classList.remove('audio-live');
    root = null;
  });

  it('publishes one CSS custom property per voice while the music plays', () => {
    const ctx = setup();
    root = ctx.root;
    ctx.visuals.start();
    expect(ctx.audio.hook).not.toBeNull();

    ctx.audio.hook?.([0.5, 0.25, 0.125, 0.4]);

    expect(ctx.root.style.getPropertyValue('--audio-drone')).toBe('0.5');
    expect(ctx.root.style.getPropertyValue('--audio-pad')).toBe('0.25');
    // Arrotondato a 2 decimali per non scrivere a ogni minima variazione.
    expect(ctx.root.style.getPropertyValue('--audio-air')).toBe('0.13');
    expect(ctx.root.style.getPropertyValue('--audio-signals')).toBe('0.4');
    expect(ctx.root.classList.contains('audio-live')).toBe(true);
  });

  it('clears the reactive state when every voice goes silent', () => {
    const ctx = setup();
    root = ctx.root;
    ctx.visuals.start();

    ctx.audio.hook?.([0.8, 0.6, 0.4, 0.7]);
    expect(ctx.root.classList.contains('audio-live')).toBe(true);

    // Il silenzio bypassa il throttle: i visual devono spegnersi davvero.
    ctx.audio.hook?.(SILENT);
    expect(ctx.root.style.getPropertyValue('--audio-drone')).toBe('0');
    expect(ctx.root.style.getPropertyValue('--audio-air')).toBe('0');
    expect(ctx.root.classList.contains('audio-live')).toBe(false);
  });

  it('stays inert with prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const ctx = setup();
    root = ctx.root;
    ctx.visuals.start();
    expect(ctx.audio.hook).toBeNull();
  });
});
