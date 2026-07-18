import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Reveal } from './reveal';

@Component({
  imports: [Reveal],
  template: '<div appReveal>contenuto</div>',
})
class Host {}

describe('Reveal', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('reveals the element immediately when IntersectionObserver is unavailable', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector('div');
    expect(el?.classList.contains('reveal')).toBe(true);
    expect(el?.classList.contains('reveal-in')).toBe(true);
  });
});
