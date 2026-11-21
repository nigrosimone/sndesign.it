import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { OS_STATS } from '../data/open-source';
import { LiveStats } from './live-stats';

const DAY = 24 * 60 * 60 * 1000;

/** Moves the clock to `days` after the build-time data date. */
function setDataAge(days: number): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.parse(OS_STATS.updatedAt) + days * DAY);
}

function stubIdleCallback(): void {
  vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
    cb();
    return 0;
  });
}

describe('LiveStats', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('updates signals with data from npm and GitHub APIs', async () => {
    setDataAge(31);
    stubIdleCallback();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('api.npmjs.org')) {
          return Promise.resolve(
            new Response(JSON.stringify({ 'ng-let': { package: 'ng-let', downloads: 60000 } }), {
              status: 200,
            }),
          );
        }
        if (url.includes('rate_limit')) {
          return Promise.resolve(
            new Response(JSON.stringify({ resources: { core: { remaining: 42 } } }), {
              status: 200,
            }),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { name: 'ng-let', fork: false, stargazers_count: 50 },
              { name: 'a-fork', fork: true, stargazers_count: 999 },
            ]),
            { status: 200 },
          ),
        );
      }),
    );

    const stats = TestBed.inject(LiveStats);
    stats.start();

    await vi.waitFor(() => {
      expect(stats.npmDownloads()).toBe(60000);
    });
    expect(stats.packageDownloads().get('ng-let')).toBe(60000);
    expect(stats.githubStars()).toBe(50);
    expect(stats.repoStars().get('ng-let')).toBe(50);
  });

  it('keeps the baked-in values when the network fails', async () => {
    setDataAge(31);
    stubIdleCallback();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );

    const stats = TestBed.inject(LiveStats);
    stats.start();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stats.npmDownloads()).toBe(OS_STATS.npmMonthlyDownloads);
    expect(stats.githubStars()).toBe(OS_STATS.githubStars);
  });

  it('does not call the APIs when the build-time data is less than a month old', async () => {
    setDataAge(29);
    stubIdleCallback();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const stats = TestBed.inject(LiveStats);
    stats.start();
    await Promise.resolve();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stats.npmDownloads()).toBe(OS_STATS.npmMonthlyDownloads);
  });
});
