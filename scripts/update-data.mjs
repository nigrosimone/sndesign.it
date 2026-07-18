/**
 * Rigenera src/app/data/open-source.ts e src/app/data/articles.ts
 * con i dati aggiornati dalle API pubbliche di GitHub, npm e dev.to.
 *
 * Uso: npm run update-data
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const GITHUB_USER = 'nigrosimone';
const NPM_MAINTAINER = 'nigro.simone';
const DEVTO_USER = 'nigrosimone';
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'data');

// Descrizioni italiane curate (selezione dei progetti mostrati). L'ordine qui è
// irrilevante: in pagina i progetti sono ordinati per stelle (vedi sort sotto).
const PROJECT_DESCRIPTIONS = new Map([
  ['ng-http-caching', 'Cache per le richieste HTTP nelle applicazioni Angular.'],
  ['ng-let', 'Direttiva strutturale per dichiarare variabili locali nei template HTML.'],
  ['ng-simple-state', 'State management semplice per Angular, con soli Services e Signal. Supporta WebMCP.'],
  ['ng-for-track-by-property', 'trackBy globale per i cicli nei template, con type checking rigoroso.'],
  ['ng-generic-pipe', 'Pipe generica per usare i metodi del componente nel template.'],
  ['codice-fiscale', 'Libreria PHP per la validazione dei codici fiscali italiani, con supporto omocodia.'],
  ['ng-as', 'Pipe e direttiva per il type casting delle variabili nei template.'],
  ['ng-lock', 'Decorator Angular per bloccare funzioni e interfaccia durante i task asincroni.'],
  ['turbo-array', 'Pipeline lazy ad alte prestazioni per gli array JavaScript, fino a 4× più veloci.'],
  ['express-fast-json-stringify', 'fast-json-stringify in Express: serializzazione JSON più veloce con JSON Schema.'],
]);

// Elementi da nascondere in pagina (e nei tool WebMCP): vengono esclusi del tutto
// dai file generati, così non finiscono nemmeno nel bundle. Questa è l'unica fonte
// di verità e sopravvive alla rigenerazione (editare i file generati a mano no).
// Progetti/pacchetti per nome; articoli per slug (ultimo segmento dell'URL dev.to).
const HIDDEN_PROJECTS = new Set([
  // 'ng-lock',
]);
const HIDDEN_ARTICLES = new Set([
  // 'turbo-array-supercharge-your-javascript-array-operations-4fmc',
]);
const HIDDEN_PACKAGES = new Set([
  // 'piffero',
]);

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} - ${url}`);
  }
  return res.json();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const repos = await fetchJson(
  `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner`,
);
const search = await fetchJson(
  `https://registry.npmjs.org/-/v1/search?text=maintainer:${NPM_MAINTAINER}&size=250`,
);
const packageNames = search.objects.map((o) => o.package.name);
const downloadsByPackage = new Map();
if (packageNames.length > 0) {
  const bulk = await fetchJson(
    `https://api.npmjs.org/downloads/point/last-month/${packageNames.join(',')}`,
  );
  // Con un solo pacchetto la API restituisce l'oggetto diretto anziché la mappa.
  if (bulk.package) {
    downloadsByPackage.set(bulk.package, bulk.downloads ?? 0);
  } else {
    for (const [name, info] of Object.entries(bulk)) {
      downloadsByPackage.set(name, info?.downloads ?? 0);
    }
  }
}
const devtoArticles = await fetchJson(
  `https://dev.to/api/articles?username=${DEVTO_USER}&per_page=100`,
);

const reposByName = new Map(repos.map((r) => [r.name, r]));
const originalRepos = repos.filter((r) => !r.fork && r.name !== GITHUB_USER);

for (const repo of originalRepos) {
  if (!PROJECT_DESCRIPTIONS.has(repo.name) && repo.stargazers_count >= 5 && !repo.archived) {
    console.warn(
      `⚠ ${repo.name} (${repo.stargazers_count}★) non è tra i progetti curati: valutane l'aggiunta in PROJECT_DESCRIPTIONS.`,
    );
  }
}

const projects = [...PROJECT_DESCRIPTIONS.entries()]
  .filter(([name]) => {
    if (HIDDEN_PROJECTS.has(name)) {
      return false;
    }
    const repo = reposByName.get(name);
    if (!repo) {
      throw new Error(`Repository GitHub non trovato: ${name}`);
    }
    // Escludiamo i repo archiviati e quelli senza stelle.
    return !repo.archived && repo.stargazers_count > 0;
  })
  .map(([name, description]) => {
    const repo = reposByName.get(name);
    const isPhp = repo.language === 'PHP';
    const downloads = downloadsByPackage.get(name);
    return {
      name,
      description,
      language: repo.language ?? 'TypeScript',
      stars: repo.stargazers_count,
      monthlyDownloads: isPhp ? undefined : downloads,
      repoUrl: repo.html_url,
      packageUrl: isPhp
        ? `https://packagist.org/packages/${GITHUB_USER}/codicefiscale`
        : `https://www.npmjs.com/package/${name}`,
    };
  })
  // Ordine per stelle (decrescente); a parità, per download e poi per nome.
  .sort(
    (a, b) =>
      b.stars - a.stars ||
      (b.monthlyDownloads ?? 0) - (a.monthlyDownloads ?? 0) ||
      a.name.localeCompare(b.name),
  );

const packages = search.objects
  .filter((o) => !HIDDEN_PACKAGES.has(o.package.name))
  .map((o) => ({
    name: o.package.name,
    description: o.package.description ?? '',
    version: o.package.version,
    monthlyDownloads: downloadsByPackage.get(o.package.name) ?? 0,
    url: `https://www.npmjs.com/package/${o.package.name}`,
  }))
  .sort((a, b) => b.monthlyDownloads - a.monthlyDownloads);

const stats = {
  npmMonthlyDownloads: packages.reduce((sum, p) => sum + p.monthlyDownloads, 0),
  npmPackages: packages.length,
  githubStars: originalRepos.reduce((sum, r) => sum + r.stargazers_count, 0),
  githubRepos: repos.length,
  updatedAt: today(),
};

const articles = devtoArticles
  .filter((a) => !HIDDEN_ARTICLES.has(a.slug))
  .map((a) => ({
    title: a.title,
    url: a.url,
    date: a.published_at.slice(0, 10),
    readingMinutes: a.reading_time_minutes,
    tags: a.tag_list,
    reactions: a.positive_reactions_count,
  }))
  .sort((a, b) => b.date.localeCompare(a.date));

// JSON.stringify serializza i valori senza toccare gli apici interni (evita di
// corrompere i testi con apostrofi); poi Prettier riscrive il file nello stile
// del repo (.prettierrc: apici singoli, chiavi senza virgolette, array corti in
// linea), così ogni rigenerazione produce solo diff sui dati reali, non sul
// formato. Le stringhe con apostrofo restano tra doppi apici (scelta di Prettier).
const ts = (value) => JSON.stringify(value, null, 2);

const openSourceFile = `// Dati raccolti dalle API pubbliche di GitHub e npm il ${formatDate(stats.updatedAt)}.
// Per aggiornarli: npm run update-data (rigenera questo file).
import type { NpmPackage, OpenSourceStats, Project } from './types';

export const PROJECTS: readonly Project[] = ${ts(projects)};

export const PACKAGES: readonly NpmPackage[] = ${ts(packages)};

export const OS_STATS: OpenSourceStats = ${ts(stats)};
`;

const articlesFile = `// Articoli pubblicati su https://dev.to/${DEVTO_USER} (API pubblica dev.to, ${formatDate(stats.updatedAt)}).
// Per aggiornarli: npm run update-data (rigenera questo file).
import type { Article } from './types';

export const ARTICLES: readonly Article[] = ${ts(articles)};
`;

async function writeFormatted(fileName, source) {
  const filePath = join(DATA_DIR, fileName);
  const config = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(source, { ...config, filepath: filePath });
  await writeFile(filePath, formatted);
}

await writeFormatted('open-source.ts', openSourceFile);
await writeFormatted('articles.ts', articlesFile);

console.log(`✔ Dati aggiornati al ${formatDate(stats.updatedAt)}:`);
console.log(`  ${stats.npmPackages} pacchetti npm, ${stats.npmMonthlyDownloads} download/mese`);
console.log(`  ${stats.githubStars} stelle GitHub, ${articles.length} articoli dev.to`);
console.log('Ricontrolla il diff prima del commit (descrizioni curate, undefined nei campi opzionali).');
