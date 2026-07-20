import { DOCUMENT, PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { prefersReducedMotion } from '../directives/motion';
import { AmbientAudio, VOICE_KEYS } from './ambient-audio';

/**
 * Ponte fra le voci della musica e il CSS: pubblica una variabile per voce
 * (--audio-drone, --audio-pad, --audio-air, --audio-signals) sull'elemento radice,
 * così ogni effetto di sfondo può legarsi alla *sua* voce in modo dichiarativo.
 * Il legame resta leggibile: se abbassi una base, il suo effetto si spegne.
 *
 * Non ha un proprio requestAnimationFrame: si aggancia al loop che AmbientAudio
 * fa già girare mentre suona ({@link AmbientAudio.onFrame}), quindi a musica
 * spenta il costo è esattamente zero. Le scritture sono limitate a ~30fps e solo
 * quando il valore cambia davvero (arrotondato a 2 decimali), per non innescare
 * ricalcoli di stile inutili.
 *
 * Con prefers-reduced-motion non si attiva: le variabili restano assenti e il CSS
 * usa i fallback a 0, cioè l'aspetto originale del sito.
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

  /** Aggancia il ponte. Chiamare da afterNextRender (solo browser). */
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
    // Lo zero finale (fine fade) passa sempre, così i visual si spengono davvero.
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
    // Segnala che la musica suona: il CSS abbassa il fondo degli effetti legati
    // alle voci (a voce muta quasi spariti) e promuove il layer dei bagliori.
    root.classList.toggle('audio-live', !silent);
  }
}
