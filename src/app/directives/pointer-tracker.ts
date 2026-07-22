import { DestroyRef } from '@angular/core';

/** Pointer state shared by the background effects (see MatrixRain, GridWarp). */
export interface PointerTracker {
  /** Last pointer position in CSS pixels; client coordinates, since both effects are fixed. */
  x: number;
  y: number;
  /** 1 while the pointer is over the page, 0 once it leaves: consumers smooth it themselves. */
  target: number;
}

/**
 * Attaches passive listeners that only store the pointer position: the callers' existing rAF
 * loops read them, so moving the pointer schedules no extra work. Returns null for coarse
 * pointers (touch), where there is no hover and the "pointer" would stay stuck where the last
 * tap happened, so the effects must stay off.
 *
 * Cleanup is registered on `destroyRef`; call it from afterNextRender (browser only).
 */
export function trackPointer(destroyRef: DestroyRef): PointerTracker | null {
  // typeof guard: matchMedia does not exist under jsdom in tests, same as in motion.ts.
  const fine =
    typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) {
    return null;
  }
  const tracker: PointerTracker = { x: 0, y: 0, target: 0 };
  const onMove = (ev: PointerEvent): void => {
    tracker.x = ev.clientX;
    tracker.y = ev.clientY;
    tracker.target = 1;
  };
  const onLeave = (): void => {
    tracker.target = 0;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  destroyRef.onDestroy(() => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  });
  return tracker;
}
