export interface Project {
  name: string;
  description: string;
  language: 'TypeScript' | 'PHP' | 'JavaScript';
  stars: number;
  monthlyDownloads?: number;
  repoUrl: string;
  packageUrl?: string;
}

export interface NpmPackage {
  name: string;
  description: string;
  version: string;
  monthlyDownloads: number;
  url: string;
}

export interface Article {
  title: string;
  url: string;
  date: string;
  readingMinutes: number;
  tags: string[];
  reactions: number;
}

export interface OpenSourceStats {
  npmMonthlyDownloads: number;
  npmPackages: number;
  githubStars: number;
  githubRepos: number;
  updatedAt: string;
}

export interface Contribution {
  repo: string;
  repoUrl: string;
  stars: number;
  number: number;
  title: string;
  url: string;
  date: string;
}

export interface ContributionStats {
  mergedPullRequests: number;
  repos: number;
  searchUrl: string;
}

export interface Experience {
  id: string;
  company: string;
  from: number;
  to?: number;
}
