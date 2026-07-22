import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EVENT_HORIZON, GridWarp, HOLE_RADIUS, holePull } from './grid-warp';

@Component({
  imports: [GridWarp],
  template: '<canvas appGridWarp></canvas>',
})
class Host {}

describe('GridWarp', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('mounts without throwing when a 2D context is unavailable (jsdom)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('leaves the CSS grid in place when it does not take over', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(document.documentElement.classList.contains('grid-warped')).toBe(false);
  });

  describe('holePull', () => {
    it('does not deform anything at or beyond the influence radius', () => {
      expect(holePull(HOLE_RADIUS)).toBe(0);
      expect(holePull(600)).toBe(0);
    });

    it('never pulls a point inside the event horizon', () => {
      for (let d = 1; d < HOLE_RADIUS; d += 3) {
        expect(d - holePull(d)).toBeGreaterThanOrEqual(EVENT_HORIZON - 1e-9);
      }
    });

    it('collapses onto the horizon everything close to the centre', () => {
      // Saturated branch: the pull is exactly what it takes to land on the horizon.
      expect(holePull(EVENT_HORIZON * 1.3)).toBeCloseTo(EVENT_HORIZON * 0.3, 5);
      // Inside it the pull is negative, i.e. the point is pushed back out onto the ring.
      expect(holePull(5)).toBeLessThan(0);
      expect(5 - holePull(5)).toBeCloseTo(EVENT_HORIZON, 5);
    });

    it('pulls harder closer to the hole, and only slightly at the edge', () => {
      expect(holePull(80)).toBeGreaterThan(holePull(160));
      expect(holePull(160)).toBeGreaterThan(0);
      expect(holePull(HOLE_RADIUS - 1)).toBeLessThan(0.5);
    });
  });
});
