import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatrixRain, lensFalloff } from './matrix-rain';

@Component({
  imports: [MatrixRain],
  template: '<canvas appMatrixRain></canvas>',
})
class Host {}

describe('MatrixRain', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('mounts without throwing when a 2D context is unavailable (jsdom)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  describe('lensFalloff', () => {
    it('is maximum under the cursor and fades to zero at the edge', () => {
      expect(lensFalloff(0)).toBe(1);
      expect(lensFalloff(85)).toBeCloseTo(0.5, 5);
      expect(lensFalloff(170)).toBe(0);
    });

    it('does not deform anything beyond the radius', () => {
      expect(lensFalloff(400)).toBe(0);
    });

    it('decreases monotonically', () => {
      for (let d = 0; d < 170; d += 10) {
        expect(lensFalloff(d)).toBeGreaterThan(lensFalloff(d + 10));
      }
    });
  });
});
