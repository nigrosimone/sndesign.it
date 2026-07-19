import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatrixRain } from './matrix-rain';

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
});
