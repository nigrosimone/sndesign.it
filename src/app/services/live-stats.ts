import { Service, signal } from '@angular/core';
import { OS_STATS, PACKAGES } from '../data/open-source';

const GITHUB_REPOS_URL = 'https://api.github.com/users/nigrosimone/repos?per_page=100&type=owner';
const GITHUB_RATE_URL = 'https://api.github.com/rate_limit';
const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads/point/last-month/';

interface GitHubRepo {
  name: string;
  fork: boolean;
  stargazers_count: number;
}

interface NpmDownloads {
  package: string;
  downloads: number;
}

/**
 * Live npm/GitHub stats: starts from the build-time static values (good for SEO
 * and first paint), then refreshes them on idle from the public APIs. On failure
 * the static values stay.
 */
@Service()
export class LiveStats {
  readonly npmDownloads = signal(OS_STATS.npmMonthlyDownloads);
  readonly githubStars = signal(OS_STATS.githubStars);
  readonly packageDownloads = signal<ReadonlyMap<string, number>>(new Map());
  readonly repoStars = signal<ReadonlyMap<string, number>>(new Map());

  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1500);
    idle(() => {
      void this.refreshNpm();
      void this.refreshGitHub();
    });
  }

  private async refreshNpm(): Promise<void> {
    try {
      const names = PACKAGES.map((p) => p.name).join(',');
      const res = await fetch(NPM_DOWNLOADS_URL + names);
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as
        | NpmDownloads
        | Record<string, NpmDownloads | null>;
      const byName: Record<string, NpmDownloads | null> =
        'package' in data && typeof data.package === 'string'
          ? { [data.package]: data as NpmDownloads }
          : (data as Record<string, NpmDownloads | null>);
      const map = new Map<string, number>();
      let total = 0;
      for (const pkg of PACKAGES) {
        const downloads = byName[pkg.name]?.downloads;
        if (typeof downloads === 'number') {
          map.set(pkg.name, downloads);
          total += downloads;
        }
      }
      if (total > 0) {
        this.packageDownloads.set(map);
        this.npmDownloads.set(total);
      }
    } catch {
      // Offline or API unreachable: keep the static data.
    }
  }

  private async refreshGitHub(): Promise<void> {
    try {
      // Rate-limit preflight (does not consume quota): without quota the repos
      // call would 403 and pollute the console (and Lighthouse).
      const limit = await fetch(GITHUB_RATE_URL);
      if (!limit.ok) {
        return;
      }
      const rate = (await limit.json()) as { resources?: { core?: { remaining?: number } } };
      if ((rate.resources?.core?.remaining ?? 0) < 1) {
        return;
      }
      const res = await fetch(GITHUB_REPOS_URL);
      if (!res.ok) {
        return;
      }
      const repos = (await res.json()) as GitHubRepo[];
      const own = repos.filter((r) => !r.fork && r.name !== 'nigrosimone');
      if (own.length === 0) {
        return;
      }
      this.repoStars.set(new Map(own.map((r) => [r.name, r.stargazers_count])));
      this.githubStars.set(own.reduce((sum, r) => sum + r.stargazers_count, 0));
    } catch {
      // Offline or API unreachable: keep the static data.
    }
  }
}
