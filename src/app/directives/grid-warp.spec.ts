import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EVENT_HORIZON, GridWarp, HOLE_RADIUS, followHoleCoordinate, holePull } from './grid-warp';

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

  describe('followHoleCoordinate', () => {
    it('follows movement in either direction without jumping or overshooting', () => {
      const forward = followHoleCoordinate(100, 700, 33);
      const backward = followHoleCoordinate(700, 100, 33);
      expect(forward).toBeGreaterThan(100);
      expect(forward).toBeLessThan(700);
      expect(backward).toBeGreaterThan(100);
      expect(backward).toBeLessThan(700);
      expect(forward - 100).toBeCloseTo(700 - backward, 8);
    });

    it('has the same response over equal elapsed time at different frame rates', () => {
      let regular = 100;
      let slower = 100;
      for (let frame = 0; frame < 6; frame++) {
        regular = followHoleCoordinate(regular, 700, 33);
      }
      for (let frame = 0; frame < 3; frame++) {
        slower = followHoleCoordinate(slower, 700, 66);
      }
      expect(regular).toBeCloseTo(slower, 8);
    });

    it('settles exactly and then remains unchanged, allowing idle repaint checks to succeed', () => {
      let position = 100;
      for (let frame = 0; frame < 40; frame++) {
        position = followHoleCoordinate(position, 700, 33);
      }
      expect(position).toBe(700);
      expect(followHoleCoordinate(position, 700, 33)).toBe(position);
    });

    it('resumes at the current pointer after a suspended frame instead of replaying movement', () => {
      expect(followHoleCoordinate(100, 700, 5000)).toBe(700);
    });

    it('does not advance without elapsed time', () => {
      expect(followHoleCoordinate(100, 700, 0)).toBe(100);
    });
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
