import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AsciiPortrait, brightness, glyphFor } from './ascii-portrait';

@Component({
  imports: [AsciiPortrait],
  template: '<canvas appAsciiPortrait="avatar.jpg"></canvas>',
})
class Host {}

describe('AsciiPortrait', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('mounts without throwing and leaves the canvas hidden (jsdom)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas');
    expect(canvas?.classList.contains('is-on')).toBe(false);
  });

  it('maps brightness to glyphs, darkest first', () => {
    expect(glyphFor(0)).toBe(' ');
    expect(glyphFor(0.5)).toBe('+');
    expect(glyphFor(1)).toBe('@');
    expect(glyphFor(-1)).toBe(' ');
  });

  it('follows the photo and fades the corners out', () => {
    expect(brightness(1, 0.5, 0.45)).toBe(1);
    expect(brightness(0, 0.5, 0.45)).toBe(0);
    expect(glyphFor(brightness(1, 1, 1))).toBe(' ');
    expect(brightness(0.6, 0.5, 0.5)).toBeGreaterThan(brightness(0.4, 0.5, 0.5));
  });
});
