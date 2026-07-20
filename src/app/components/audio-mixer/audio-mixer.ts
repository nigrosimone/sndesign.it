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
 * Floating widget driving the generative audio engine ({@link AmbientAudio}):
 * play/pause, volume, mix "movement" and one slider per voice. Off by default;
 * choice and levels are persisted. If the music was on last visit it resumes on
 * the first user gesture, since browsers forbid autoplay.
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
    // Animate the sliders only while the panel is open (no idle change detection).
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

  /** First touch on a slider: pin the voice immediately so it stops drifting. */
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

  /** Resumes the music on the first gesture if it was on when the user left. */
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
