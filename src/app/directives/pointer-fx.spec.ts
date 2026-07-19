import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PointerFx } from './pointer-fx';

@Component({
  imports: [PointerFx],
  template: '<article appPointerFx>card</article>',
})
class Host {}

describe('PointerFx', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('stays inert without a fine pointer (touch / no matchMedia)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector('article');
    expect(el?.classList.contains('is-tilting')).toBe(false);
    expect(el?.style.transform).toBe('');
  });
});
