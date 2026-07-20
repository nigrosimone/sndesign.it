import { DOCUMENT, PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { prefersReducedMotion } from '../directives/motion';
import { AmbientAudio, VOICE_KEYS } from './ambient-audio';

/**
 * Bridges the music voices to CSS by publishing one custom property per voice
 * (--audio-drone, --audio-pad, --audio-air, --audio-signals) on the root element.
 * It rides {@link AmbientAudio.onFrame} instead of owning a rAF loop, so it costs
 * nothing while the music is off; writes are throttled to ~30fps and skipped when
 * the rounded value is unchanged. Inert under prefers-reduced-motion: the
 * properties stay absent and CSS falls back to 0.
 */
const THROTTLE_MS = 33;
const VARS = VOICE_KEYS.map((key) => `--audio-${key}`);

@Service()
export class AudioVisuals {
  private readonly audio = inject(AmbientAudio);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private started = false;
  private last = 0;
  private readonly written = VARS.map(() => -1);

  /** Attaches the bridge. Call from afterNextRender (browser only). */
  start(): void {
    if (this.started || !this.isBrowser || prefersReducedMotion()) {
      return;
    }
    this.started = true;
    this.audio.onFrame((voices) => {
      this.publish(voices);
    });
  }

  private publish(voices: readonly number[]): void {
    const root = this.doc.documentElement;
    const now = typeof performance === 'object' ? performance.now() : 0;
    const silent = voices.every((v) => v === 0);
    // The final zero (end of fade) always gets through, so the visuals really stop.
    if (!silent && now - this.last < THROTTLE_MS) {
      return;
    }
    this.last = now;
    for (let i = 0; i < VARS.length; i++) {
      const rounded = Math.round(voices[i] * 100) / 100;
      if (this.written[i] === rounded) {
        continue;
      }
      this.written[i] = rounded;
      root.style.setProperty(VARS[i], String(rounded));
    }
    // Signals that the music is playing: CSS lowers the baseline of the
    // voice-driven effects and promotes the glow layer.
    root.classList.toggle('audio-live', !silent);
  }
}
