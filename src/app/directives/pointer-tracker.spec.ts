import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { trackPointer } from './pointer-tracker';

describe('trackPointer', () => {
  it('returns null without a fine pointer (jsdom has no matchMedia), attaching nothing', () => {
    const injector = TestBed.inject(Injector);
    const add = vi.spyOn(window, 'addEventListener');
    const tracker = runInInjectionContext(injector, () => trackPointer(TestBed.inject(DestroyRef)));
    expect(tracker).toBeNull();
    expect(add).not.toHaveBeenCalled();
    add.mockRestore();
  });
});
