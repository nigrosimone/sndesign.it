// Dati raccolti dalle API pubbliche di GitHub e npm il 30/10/2026.
// Per aggiornarli: npm run update-data (rigenera questo file).
import type { NpmPackage, OpenSourceStats, Project } from './types';

export const PROJECTS: readonly Project[] = [
  {
    name: 'ng-let',
    description:
      'Angular structural directive for sharing data as local variable into html component template.',
    language: 'TypeScript',
    stars: 47,
    monthlyDownloads: 54888,
    repoUrl: 'https://github.com/nigrosimone/ng-let',
    packageUrl: 'https://www.npmjs.com/package/ng-let',
  },
  {
    name: 'ng-http-caching',
    description: 'Cache for HTTP requests in Angular application.',
    language: 'TypeScript',
    stars: 54,
    monthlyDownloads: 11466,
    repoUrl: 'https://github.com/nigrosimone/ng-http-caching',
    packageUrl: 'https://www.npmjs.com/package/ng-http-caching',
  },
  {
    name: 'ng-generic-pipe',
    description:
      'Generic pipe for Angular application for use a component method into component template',
    language: 'TypeScript',
    stars: 21,
    monthlyDownloads: 4380,
    repoUrl: 'https://github.com/nigrosimone/ng-generic-pipe',
    packageUrl: 'https://www.npmjs.com/package/ng-generic-pipe',
  },
  {
    name: 'ng-as',
    description: 'Angular pipe and directive for type casting template variables.',
    language: 'TypeScript',
    stars: 9,
    monthlyDownloads: 2601,
    repoUrl: 'https://github.com/nigrosimone/ng-as',
    packageUrl: 'https://www.npmjs.com/package/ng-as',
  },
  {
    name: 'fulmine.js',
    description:
      'Fulmine.js ⚡ A blazing-fast Express.js compatible HTTP server on uWebSockets.js.',
    language: 'JavaScript',
    stars: 28,
    monthlyDownloads: 2316,
    repoUrl: 'https://github.com/nigrosimone/fulmine.js',
    packageUrl: 'https://www.npmjs.com/package/fulmine.js',
  },
  {
    name: 'ng-for-track-by-property',
    description: 'Angular global trackBy property directive with strict type checking.',
    language: 'TypeScript',
    stars: 28,
    monthlyDownloads: 583,
    repoUrl: 'https://github.com/nigrosimone/ng-for-track-by-property',
    packageUrl: 'https://www.npmjs.com/package/ng-for-track-by-property',
  },
  {
    name: 'ng-simple-state',
    description: 'Simple state management in Angular with only Services and Signal.',
    language: 'TypeScript',
    stars: 46,
    monthlyDownloads: 574,
    repoUrl: 'https://github.com/nigrosimone/ng-simple-state',
    packageUrl: 'https://www.npmjs.com/package/ng-simple-state',
  },
  {
    name: 'ng-lock',
    description: 'Angular decorator for lock a function and user interface while a task running.',
    language: 'TypeScript',
    stars: 10,
    monthlyDownloads: 109,
    repoUrl: 'https://github.com/nigrosimone/ng-lock',
    packageUrl: 'https://www.npmjs.com/package/ng-lock',
  },
  {
    name: 'codice-fiscale',
    description:
      "Libreria PHP per la validazione dei Codici Fiscali italiani a 16 caratteri con supporto per l'omocodia",
    language: 'PHP',
    stars: 17,
    repoUrl: 'https://github.com/nigrosimone/codice-fiscale',
    packageUrl: 'https://packagist.org/packages/nigrosimone/codicefiscale',
  },
  {
    name: 'llms-robot-arena',
    description: 'An arena where LLMs write robot controllers and their code competes.',
    language: 'JavaScript',
    stars: 13,
    repoUrl: 'https://github.com/nigrosimone/llms-robot-arena',
  },
  {
    name: 'postgres-benchmarks',
    description:
      'A benchmark focusing on the performance of Postgres client libraries for Node.js, brianc/node-postgres VS porsager/postgres',
    language: 'TypeScript',
    stars: 8,
    repoUrl: 'https://github.com/nigrosimone/postgres-benchmarks',
  },
];

export const PACKAGES: readonly NpmPackage[] = [
  {
    name: 'ng-let',
    description:
      'Angular structural directive for sharing data as local variable into html component template.',
    version: '22.0.0',
    monthlyDownloads: 54888,
    url: 'https://www.npmjs.com/package/ng-let',
  },
  {
    name: 'ng-http-caching',
    description: 'Cache for HTTP requests in Angular application.',
    version: '22.5.0',
    monthlyDownloads: 11466,
    url: 'https://www.npmjs.com/package/ng-http-caching',
  },
  {
    name: 'ng-generic-pipe',
    description:
      'Generic pipe for Angular application for use a component method into component template.',
    version: '22.0.0',
    monthlyDownloads: 4380,
    url: 'https://www.npmjs.com/package/ng-generic-pipe',
  },
  {
    name: 'ng-as',
    description: 'Angular pipe and directive for type casting template variables.',
    version: '22.1.0',
    monthlyDownloads: 2601,
    url: 'https://www.npmjs.com/package/ng-as',
  },
  {
    name: 'fulmine.js',
    description:
      'Drop-in Express 5 replacement on uWebSockets.js, up to 16x faster. Same API, your middleware and framework keep working.',
    version: '5.26.0',
    monthlyDownloads: 2316,
    url: 'https://www.npmjs.com/package/fulmine.js',
  },
  {
    name: 'ng-for-track-by-property',
    description: 'Angular global trackBy property directive with strict type checking.',
    version: '22.0.0',
    monthlyDownloads: 583,
    url: 'https://www.npmjs.com/package/ng-for-track-by-property',
  },
  {
    name: 'ng-simple-state',
    description: 'Simple state management in Angular with only Services and Signal.',
    version: '22.1.0',
    monthlyDownloads: 574,
    url: 'https://www.npmjs.com/package/ng-simple-state',
  },
  {
    name: 'express-fast-json-stringify',
    description:
      'With express-fast-json-stringify, you can leverage fast-json-stringify in your Express application to improve JSON serialization performance',
    version: '2.0.0',
    monthlyDownloads: 202,
    url: 'https://www.npmjs.com/package/express-fast-json-stringify',
  },
  {
    name: 'ng-lock',
    description: 'Angular decorator for lock a function and user interface while a task running.',
    version: '22.0.0',
    monthlyDownloads: 109,
    url: 'https://www.npmjs.com/package/ng-lock',
  },
  {
    name: 'ng-ssr-caching',
    description: 'Cache for server-side rendered pages in Angular SSR (and any Express handler).',
    version: '22.2.0',
    monthlyDownloads: 104,
    url: 'https://www.npmjs.com/package/ng-ssr-caching',
  },
  {
    name: 'pg-telaio',
    description:
      'A sql tagged template for node-postgres, with pipelined queries underneath, without replacing its Pool',
    version: '1.0.0',
    monthlyDownloads: 25,
    url: 'https://www.npmjs.com/package/pg-telaio',
  },
  {
    name: 'turbo-array',
    description:
      'Turbo Array is a lightweight, high-performance, fast library that allows you to build lazy evaluation pipelines for arrays.',
    version: '1.3.0',
    monthlyDownloads: 20,
    url: 'https://www.npmjs.com/package/turbo-array',
  },
];

export const OS_STATS: OpenSourceStats = {
  npmMonthlyDownloads: 77268,
  npmPackages: 12,
  githubStars: 316,
  githubRepos: 88,
  updatedAt: '2026-10-30',
};
