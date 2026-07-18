import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideLiveStatsStub, provideTranslocoTesting } from '../../testing';
import { Projects } from '../projects/projects';
import { Site } from './site';

async function setup(lang: 'it' | 'en') {
  await TestBed.configureTestingModule({
    imports: [Site],
    providers: [
      provideRouter([]),
      provideTranslocoTesting(),
      provideLiveStatsStub(),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { lang } } } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Site);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('Site', () => {
  it('renders the hero title and sets Italian metadata on /', async () => {
    const fixture = await setup('it');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Simone Nigro');
    expect(document.documentElement.lang).toBe('it');
    expect(TestBed.inject(Title).getTitle()).toContain('Simone Nigro');
    expect(compiled.textContent).toContain('Costruisco librerie open source');
  });

  it('renders English content and sets lang="en" on /en', async () => {
    const fixture = await setup('en');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(document.documentElement.lang).toBe('en');
    expect(compiled.textContent).toContain('I build open source libraries');
    expect(compiled.textContent).not.toContain('Costruisco librerie');
  });
});

describe('Projects', () => {
  it('renders all ten project cards', async () => {
    await TestBed.configureTestingModule({
      imports: [Projects],
      providers: [provideTranslocoTesting(), provideLiveStatsStub()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('article.card').length).toBeGreaterThan(0);
  });
});
