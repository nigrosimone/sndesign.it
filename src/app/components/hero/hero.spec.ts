import { githubStat } from './hero';

describe('githubStat', () => {
  it('shows the merged pull requests when they are more than the stars', () => {
    expect(githubStat(305, 413)).toEqual({ value: 413, labelKey: 'hero.stats.prs' });
  });

  it('shows the stars when a repo takes off', () => {
    expect(githubStat(5000, 413)).toEqual({ value: 5000, labelKey: 'hero.stats.stars' });
  });
});
