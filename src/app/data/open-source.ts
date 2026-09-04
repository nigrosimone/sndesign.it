// Dati raccolti dalle API pubbliche di GitHub e npm il 04/09/2026.
// Per aggiornarli: npm run update-data (rigenera questo file).
import type { NpmPackage, OpenSourceStats, Project } from './types';

export const PROJECTS: readonly Project[] = [
  {
    name: 'ng-http-caching',
    description: 'Cache for HTTP requests in Angular application.',
    language: 'TypeScript',
    stars: 54,
    monthlyDownloads: 11298,
    repoUrl: 'https://github.com/nigrosimone/ng-http-caching',
    packageUrl: 'https://www.npmjs.com/package/ng-http-caching',
  },
  {
    name: 'ng-let',
    description:
      'Angular structural directive for sharing data as local variable into html component template.',
    language: 'TypeScript',
    stars: 47,
    monthlyDownloads: 64980,
    repoUrl: 'https://github.com/nigrosimone/ng-let',
    packageUrl: 'https://www.npmjs.com/package/ng-let',
  },
  {
    name: 'ng-simple-state',
    description: 'Simple state management in Angular with only Services and Signal.',
    language: 'TypeScript',
    stars: 46,
    monthlyDownloads: 904,
    repoUrl: 'https://github.com/nigrosimone/ng-simple-state',
    packageUrl: 'https://www.npmjs.com/package/ng-simple-state',
  },
  {
    name: 'ng-for-track-by-property',
    description: 'Angular global trackBy property directive with strict type checking.',
    language: 'TypeScript',
    stars: 28,
    monthlyDownloads: 546,
    repoUrl: 'https://github.com/nigrosimone/ng-for-track-by-property',
    packageUrl: 'https://www.npmjs.com/package/ng-for-track-by-property',
  },
  {
    name: 'ng-generic-pipe',
    description:
      'Generic pipe for Angular application for use a component method into component template',
    language: 'TypeScript',
    stars: 21,
    monthlyDownloads: 4513,
    repoUrl: 'https://github.com/nigrosimone/ng-generic-pipe',
    packageUrl: 'https://www.npmjs.com/package/ng-generic-pipe',
  },
  {
    name: 'fulmine.js',
    description:
      'Fulmine.js ⚡ A blazing-fast Express.js compatible HTTP server on uWebSockets.js.',
    language: 'JavaScript',
    stars: 16,
    monthlyDownloads: 6590,
    repoUrl: 'https://github.com/nigrosimone/fulmine.js',
    packageUrl: 'https://www.npmjs.com/package/fulmine.js',
  },
  {
    name: 'codice-fiscale',
    description:
      "Libreria PHP per la validazione dei Codici Fiscali italiani a 16 caratteri con supporto per l'omocodia",
    language: 'PHP',
    stars: 16,
    repoUrl: 'https://github.com/nigrosimone/codice-fiscale',
    packageUrl: 'https://packagist.org/packages/nigrosimone/codicefiscale',
  },
  {
    name: 'ng-lock',
    description: 'Angular decorator for lock a function and user interface while a task running.',
    language: 'TypeScript',
    stars: 10,
    monthlyDownloads: 286,
    repoUrl: 'https://github.com/nigrosimone/ng-lock',
    packageUrl: 'https://www.npmjs.com/package/ng-lock',
  },
  {
    name: 'ng-as',
    description: 'Angular pipe and directive for type casting template variables.',
    language: 'TypeScript',
    stars: 9,
    monthlyDownloads: 3430,
    repoUrl: 'https://github.com/nigrosimone/ng-as',
    packageUrl: 'https://www.npmjs.com/package/ng-as',
  },
  {
    name: 'postgres-benchmarks',
    description:
      'A benchmark focusing on the performance of Postgres client libraries for Node.js, brianc/node-postgres VS porsager/postgres',
    language: 'TypeScript',
    stars: 6,
    repoUrl: 'https://github.com/nigrosimone/postgres-benchmarks',
  },
  {
    name: 'turbo-array',
    description:
      'Turbo Array is a lightweight, high-performance library that allows you to build lazy evaluation pipelines for arrays. It supports operations like filter, map, reduce, forEach, and join, executing them efficiently.  A method build with Turbo Array is 4x faster than vanilla version.',
    language: 'TypeScript',
    stars: 2,
    monthlyDownloads: 37,
    repoUrl: 'https://github.com/nigrosimone/turbo-array',
    packageUrl: 'https://www.npmjs.com/package/turbo-array',
  },
  {
    name: 'ng-ssr-caching',
    description: 'Cache for server-side rendered pages in Angular SSR.',
    language: 'JavaScript',
    stars: 1,
    monthlyDownloads: 443,
    repoUrl: 'https://github.com/nigrosimone/ng-ssr-caching',
    packageUrl: 'https://www.npmjs.com/package/ng-ssr-caching',
  },
  {
    name: 'express-fast-json-stringify',
    description:
      'With express-fast-json-stringify, you can leverage fast-json-stringify in your Express application to improve JSON serialization performance',
    language: 'TypeScript',
    stars: 1,
    monthlyDownloads: 221,
    repoUrl: 'https://github.com/nigrosimone/express-fast-json-stringify',
    packageUrl: 'https://www.npmjs.com/package/express-fast-json-stringify',
  },
];

export const PACKAGES: readonly NpmPackage[] = [
  {
    name: 'ng-let',
    description:
      'Angular structural directive for sharing data as local variable into html component template.',
    version: '22.0.0',
    monthlyDownloads: 64980,
    url: 'https://www.npmjs.com/package/ng-let',
  },
  {
    name: 'ng-http-caching',
    description: 'Cache for HTTP requests in Angular application.',
    version: '22.5.0',
    monthlyDownloads: 11298,
    url: 'https://www.npmjs.com/package/ng-http-caching',
  },
  {
    name: 'fulmine.js',
    description:
      'Drop-in Express 5 replacement on uWebSockets.js. Your existing middleware keeps working.',
    version: '5.19.2',
    monthlyDownloads: 6590,
    url: 'https://www.npmjs.com/package/fulmine.js',
  },
  {
    name: 'ng-generic-pipe',
    description:
      'Generic pipe for Angular application for use a component method into component template.',
    version: '22.0.0',
    monthlyDownloads: 4513,
    url: 'https://www.npmjs.com/package/ng-generic-pipe',
  },
  {
    name: 'ng-as',
    description: 'Angular pipe and directive for type casting template variables.',
    version: '22.1.0',
    monthlyDownloads: 3430,
    url: 'https://www.npmjs.com/package/ng-as',
  },
  {
    name: 'ng-simple-state',
    description: 'Simple state management in Angular with only Services and Signal.',
    version: '22.1.0',
    monthlyDownloads: 904,
    url: 'https://www.npmjs.com/package/ng-simple-state',
  },
  {
    name: 'pg-telaio',
    description:
      'A sql tagged template for node-postgres, with pipelined queries underneath, without replacing its Pool',
    version: '1.0.0',
    monthlyDownloads: 660,
    url: 'https://www.npmjs.com/package/pg-telaio',
  },
  {
    name: 'ng-for-track-by-property',
    description: 'Angular global trackBy property directive with strict type checking.',
    version: '22.0.0',
    monthlyDownloads: 546,
    url: 'https://www.npmjs.com/package/ng-for-track-by-property',
  },
  {
    name: 'ng-ssr-caching',
    description: 'Cache for server-side rendered pages in Angular SSR (and any Express handler).',
    version: '22.2.0',
    monthlyDownloads: 443,
    url: 'https://www.npmjs.com/package/ng-ssr-caching',
  },
  {
    name: 'ng-lock',
    description: 'Angular decorator for lock a function and user interface while a task running.',
    version: '22.0.0',
    monthlyDownloads: 286,
    url: 'https://www.npmjs.com/package/ng-lock',
  },
  {
    name: 'express-fast-json-stringify',
    description:
      'With express-fast-json-stringify, you can leverage fast-json-stringify in your Express application to improve JSON serialization performance',
    version: '1.3.0',
    monthlyDownloads: 221,
    url: 'https://www.npmjs.com/package/express-fast-json-stringify',
  },
  {
    name: 'turbo-array',
    description:
      'Turbo Array is a lightweight, high-performance, fast library that allows you to build lazy evaluation pipelines for arrays.',
    version: '1.3.0',
    monthlyDownloads: 37,
    url: 'https://www.npmjs.com/package/turbo-array',
  },
];

export const OS_STATS: OpenSourceStats = {
  npmMonthlyDownloads: 93908,
  npmPackages: 12,
  githubStars: 288,
  githubRepos: 70,
  updatedAt: '2026-09-04',
};
