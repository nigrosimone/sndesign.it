import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Scramble } from './scramble';

@Component({
  imports: [Scramble],
  template: '<span appScramble>Chi sono</span>',
})
class Host {}

describe('Scramble', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('keeps the final text when IntersectionObserver is unavailable', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span');
    expect(span?.textContent).toBe('Chi sono');
  });
});
