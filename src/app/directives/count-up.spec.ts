import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../testing';
import { CountUp } from './count-up';

@Component({
  imports: [CountUp],
  template: '<span [appCountUp]="12345" countUpSuffix="+"></span>',
})
class Host {}

describe('CountUp', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideTranslocoTesting()],
    }).compileComponents();
  });

  it('renders the formatted final value when IntersectionObserver is unavailable', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span');
    expect(span?.textContent).toBe('12.345+');
  });
});
