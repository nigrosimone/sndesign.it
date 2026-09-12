import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PointerFx } from './pointer-fx';

@Component({
  imports: [PointerFx],
  template: '<article appPointerFx>card</article>',
})
class Host {}

describe('PointerFx', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  async function interactiveCard(reducedMotion = false) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('pointer: fine') || reducedMotion,
    }));
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector('article');
    if (!el) {
      throw new Error('Missing test card');
    }
    const measure = vi
      .spyOn(el, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(100, 100, 200, 160));
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      frames.delete(frameId);
    });
    const flush = (): void => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => {
        callback(performance.now());
      });
    };
    const move = (x: number, y: number, pointerType = 'mouse'): void => {
      el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType }));
    };
    return { el, fixture, measure, flush, move };
  }

  it('keeps tilt and reflection bounded when raised contents extend past the card', async () => {
    const { el, move, flush } = await interactiveCard();
    move(350, 80);
    flush();
    expect(el.style.getPropertyValue('--mx')).toBe('100%');
    expect(el.style.getPropertyValue('--my')).toBe('0%');
    expect(el.style.transform).toContain('rotateX(5deg) rotateY(5deg)');
    expect(el.style.getPropertyValue('--sheen-angle')).not.toBe('');

    el.dispatchEvent(new PointerEvent('pointerleave'));
    expect(el.style.transform).toBe('');
    expect(el.style.getPropertyValue('--sheen-angle')).toBe('');
  });

  it.each(['scroll', 'resize'])('remeasures after %s moves the card', async (eventType) => {
    const { el, measure, move, flush } = await interactiveCard();
    move(250, 140);
    flush();
    expect(el.classList.contains('is-tilting')).toBe(true);

    measure.mockReturnValue(new DOMRect(100, 20, 200, 160));
    window.dispatchEvent(new Event(eventType));
    expect(el.classList.contains('is-tilting')).toBe(false);
    expect(el.style.getPropertyValue('--mx')).toBe('');
    move(200, 100);
    flush();
    expect(measure).toHaveBeenCalledTimes(2);
    expect(el.style.getPropertyValue('--mx')).toBe('50%');
    expect(el.style.getPropertyValue('--my')).toBe('50%');
  });

  it('cancels pending work on leave and removes effects on destruction', async () => {
    const { el, fixture, move, flush } = await interactiveCard();
    move(250, 140);
    el.dispatchEvent(new PointerEvent('pointerleave'));
    flush();
    expect(el.style.transform).toBe('');

    move(250, 140);
    flush();
    expect(el.classList.contains('is-tilting')).toBe(true);
    fixture.destroy();
    expect(el.classList.contains('is-tilting')).toBe(false);
    expect(el.style.transform).toBe('');
    move(250, 140);
    flush();
    expect(el.style.transform).toBe('');
  });

  it('ignores touch input on a device that also has a mouse', async () => {
    const { el, move, flush } = await interactiveCard();
    move(250, 140, 'touch');
    flush();
    expect(el.style.transform).toBe('');
  });

  it('keeps mouse interaction static when reduced motion is requested', async () => {
    const { el, move, flush } = await interactiveCard(true);
    move(250, 140);
    flush();
    expect(el.style.transform).toBe('');
  });
});
