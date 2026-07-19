// Articoli pubblicati su https://dev.to/nigrosimone (API pubblica dev.to, 19/07/2026).
// Per aggiornarli: npm run update-data (rigenera questo file).
import type { Article } from './types';

export const ARTICLES: readonly Article[] = [
  {
    title: 'Smart HTTP Caching in Angular with NgHttpCaching',
    url: 'https://dev.to/nigrosimone/stop-hitting-your-backend-twice-smart-http-caching-in-angular-with-nghttpcaching-3fjd',
    date: '2026-03-03',
    readingMinutes: 2,
    tags: ['angular', 'typescript', 'performance', 'javascript'],
    reactions: 2,
  },
  {
    title:
      'Benchmarking PostgreSQL Drivers in Node.js: node-postgres vs postgres.js, who is the faster?',
    url: 'https://dev.to/nigrosimone/benchmarking-postgresql-drivers-in-nodejs-node-postgres-vs-postgresjs-17kl',
    date: '2025-09-06',
    readingMinutes: 2,
    tags: ['node', 'javascript', 'postgres'],
    reactions: 1,
  },
  {
    title: 'Turbo Array: Supercharge Your JavaScript Array Operations 🚀',
    url: 'https://dev.to/nigrosimone/turbo-array-supercharge-your-javascript-array-operations-4fmc',
    date: '2025-02-04',
    readingMinutes: 2,
    tags: ['javascript', 'performance', 'node', 'npm'],
    reactions: 0,
  },
  {
    title: 'Introducing Ultimate Express: The 5x Fastest Drop-In Replacement for Express.js',
    url: 'https://dev.to/nigrosimone/introducing-ultimate-express-the-5x-fastest-drop-in-replacement-for-expressjs-4kfc',
    date: '2024-10-20',
    readingMinutes: 2,
    tags: ['express', 'node'],
    reactions: 6,
  },
  {
    title:
      'Enhancing JSON Serialization Performance in Express.js with express-fast-json-stringify',
    url: 'https://dev.to/nigrosimone/enhancing-json-serialization-performance-in-expressjs-with-express-fast-json-stringify-64g',
    date: '2024-09-29',
    readingMinutes: 3,
    tags: ['express', 'node', 'javascript'],
    reactions: 1,
  },
  {
    title: 'Enable / Disable Your Angular UI During Long Tasks with ng-lock',
    url: 'https://dev.to/nigrosimone/boost-your-angular-app-with-ng-lock-a-simple-guide-3cdj',
    date: '2024-08-19',
    readingMinutes: 3,
    tags: ['angular'],
    reactions: 2,
  },
  {
    title: "Caricare componenti Angular in maniera lazy senza il routing direttamente dall'HTML",
    url: 'https://dev.to/nigrosimone/caricare-componenti-angular-in-maniera-lazy-senza-il-routing-direttamente-dallhtml-4pli',
    date: '2023-04-15',
    readingMinutes: 10,
    tags: ['angular'],
    reactions: 3,
  },
  {
    title:
      'Come creare in Angular una direttiva per dichiarare variabili nei template HTML dei componenti',
    url: 'https://dev.to/nigrosimone/come-creare-in-angular-una-direttiva-per-dichiarare-variabili-nei-template-html-dei-componenti-62a',
    date: '2022-04-04',
    readingMinutes: 5,
    tags: ['angular', 'javascript', 'typescript'],
    reactions: 8,
  },
  {
    title:
      'Angular structural directive for sharing data as local variable into html component template',
    url: 'https://dev.to/nigrosimone/angular-structural-directive-for-sharing-data-as-local-variable-into-html-component-template-31po',
    date: '2022-03-31',
    readingMinutes: 2,
    tags: ['angular', 'javascript', 'typescript'],
    reactions: 7,
  },
  {
    title: 'Angular global ngFor track by property directive with strict type checking.',
    url: 'https://dev.to/nigrosimone/angular-global-ngfor-trackby-property-directive-with-strict-type-checking-1kik',
    date: '2022-03-05',
    readingMinutes: 2,
    tags: ['angular', 'performance', 'javascript'],
    reactions: 8,
  },
  {
    title:
      'NgSimpleState. Simple state management in Angular with only Services and RxJS or Signal.',
    url: 'https://dev.to/nigrosimone/ngsimplestate-simple-state-management-in-angular-with-only-services-and-rxjs-34if',
    date: '2021-06-02',
    readingMinutes: 2,
    tags: ['angular', 'javascript', 'typescript', 'webmcp'],
    reactions: 7,
  },
];
