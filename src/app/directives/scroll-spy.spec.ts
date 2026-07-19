import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ScrollSpy } from './scroll-spy';

@Component({
  imports: [ScrollSpy],
  template:
    '<ul appScrollSpy><li><a href="/#chi-sono">about</a></li></ul><section id="chi-sono">x</section>',
})
class Host {}

describe('ScrollSpy', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('marks no link current when IntersectionObserver is unavailable', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.classList.contains('is-current')).toBe(false);
  });
});
