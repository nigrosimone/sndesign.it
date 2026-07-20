import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientAudio } from '../../services/ambient-audio';
import { provideTranslocoTesting } from '../../testing';
import { AudioMixer } from './audio-mixer';

function stubAudio() {
  return {
    playing: signal(false),
    master: signal(0.5),
    movement: signal(0.4),
    levels: signal<readonly number[]>([0.8, 0.7, 0.5, 0.6]),
    pinned: signal<readonly boolean[]>([false, false, false, false]),
    hasPins: signal(false),
    ready: signal(false),
    toggle: vi.fn(() => Promise.resolve(true)),
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    setMaster: vi.fn(),
    setMovement: vi.fn(),
    setLevel: vi.fn(),
    pin: vi.fn(),
    togglePin: vi.fn(),
    resetPins: vi.fn(),
    setVisualize: vi.fn(),
    restore: vi.fn(() => null),
  };
}

type Stub = ReturnType<typeof stubAudio>;

async function setup(stub: Stub) {
  await TestBed.configureTestingModule({
    imports: [AudioMixer],
    providers: [provideTranslocoTesting(), { provide: AmbientAudio, useValue: stub }],
  }).compileComponents();
  const fixture = TestBed.createComponent(AudioMixer);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AudioMixer', () => {
  let stub: Stub;

  beforeEach(() => {
    stub = stubAudio();
  });

  it('renders the toggle button collapsed by default', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.audio-fab')).not.toBeNull();
    expect(el.querySelector('.audio-panel')).toBeNull();
    expect(stub.restore).toHaveBeenCalledOnce();
  });

  it('opens the mixer panel on toggle click', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    fixture.detectChanges();
    expect(el.querySelector('.audio-panel')).not.toBeNull();
    // master + movement + one per voice = 6 sliders
    expect(el.querySelectorAll('input[type="range"]').length).toBe(6);
  });

  it('forwards slider changes to the service', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    fixture.detectChanges();

    const ranges = el.querySelectorAll<HTMLInputElement>('input[type="range"]');
    const master = ranges[0];
    master.value = '0.75';
    master.dispatchEvent(new Event('input'));
    expect(stub.setMaster).toHaveBeenCalledWith(0.75);

    const firstVoice = ranges[2];
    firstVoice.dispatchEvent(new Event('pointerdown'));
    expect(stub.pin).toHaveBeenCalledWith(0);
    firstVoice.value = '0.25';
    firstVoice.dispatchEvent(new Event('input'));
    expect(stub.setLevel).toHaveBeenCalledWith(0, 0.25);
  });

  it('locks a voice from its lock button', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('.audio-lock')?.click();
    expect(stub.togglePin).toHaveBeenCalledWith(0);
  });

  it('shows the reset button only when a voice is pinned', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    fixture.detectChanges();
    expect(el.querySelector('.audio-reset')).toBeNull();

    stub.hasPins.set(true);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.audio-reset')?.click();
    expect(stub.resetPins).toHaveBeenCalledOnce();
  });

  it('toggles the level animation with the panel', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    expect(stub.setVisualize).toHaveBeenLastCalledWith(true);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    expect(stub.setVisualize).toHaveBeenLastCalledWith(false);
  });

  it('toggles playback from the play button', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.audio-fab')?.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.audio-play')?.click();
    expect(stub.toggle).toHaveBeenCalledOnce();
  });

  it('reflects the playing state on the toggle button', async () => {
    const fixture = await setup(stub);
    const el = fixture.nativeElement as HTMLElement;
    const fab = el.querySelector<HTMLButtonElement>('.audio-fab');
    expect(fab?.classList.contains('is-playing')).toBe(false);

    stub.playing.set(true);
    fixture.detectChanges();
    expect(fab?.classList.contains('is-playing')).toBe(true);
  });
});
