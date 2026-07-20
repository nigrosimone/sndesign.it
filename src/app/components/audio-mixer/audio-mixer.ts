import {
  Component,
  DOCUMENT,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { AmbientAudio, VOICE_KEYS } from '../../services/ambient-audio';

/**
 * Widget flottante che pilota il motore audio generativo ({@link AmbientAudio}):
 * un pulsante che apre un piccolo mixer con play/pausa, volume, "movimento" della
 * miscela e uno slider per ognuna delle 4 basi. Off di default; la scelta e i
 * livelli sono persistiti. Se all'ultima visita la musica era attiva, la riprende
 * al primo gesto dell'utente (l'autoplay è vietato dai browser).
 */
@Component({
  selector: 'app-audio-mixer',
  templateUrl: './audio-mixer.html',
  imports: [TranslocoDirective],
})
export class AudioMixer {
  protected readonly audio = inject(AmbientAudio);
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);

  protected readonly open = signal(false);
  protected readonly voices = VOICE_KEYS.map((key, index) => ({ key, index }));

  constructor() {
    afterNextRender(() => {
      const settings = this.audio.restore();
      if (settings?.enabled) {
        this.armResumeOnGesture();
      }
    });
  }

  protected togglePanel(): void {
    const open = !this.open();
    this.open.set(open);
    // Anima i cursori solo a pannello aperto (niente change-detection a vuoto).
    this.audio.setVisualize(open);
  }

  protected close(): void {
    this.open.set(false);
    this.audio.setVisualize(false);
  }

  protected togglePlay(): void {
    void this.audio.toggle();
  }

  protected onMaster(event: Event): void {
    this.audio.setMaster((event.target as HTMLInputElement).valueAsNumber);
  }

  protected onMovement(event: Event): void {
    this.audio.setMovement((event.target as HTMLInputElement).valueAsNumber);
  }

  /** Prima interazione col cursore: blocca subito la voce così smette di muoversi. */
  protected onGrab(index: number): void {
    this.audio.pin(index);
  }

  protected onLevel(index: number, event: Event): void {
    this.audio.setLevel(index, (event.target as HTMLInputElement).valueAsNumber);
  }

  protected togglePin(index: number): void {
    this.audio.togglePin(index);
  }

  protected reset(): void {
    this.audio.resetPins();
  }

  /** Riprende la musica al primo gesto se all'uscita era attiva (no autoplay). */
  private armResumeOnGesture(): void {
    const events = ['pointerdown', 'keydown'] as const;
    const cleanup = (): void => {
      for (const e of events) {
        this.doc.removeEventListener(e, handler);
      }
    };
    const handler = (): void => {
      cleanup();
      void this.audio.start();
    };
    for (const e of events) {
      this.doc.addEventListener(e, handler);
    }
    this.destroyRef.onDestroy(cleanup);
  }
}
