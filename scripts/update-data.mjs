/**
 * Rigenera src/app/data/open-source.ts e src/app/data/articles.ts
 * con i dati aggiornati dalle API pubbliche di GitHub, npm e dev.to.
 *
 * Uso: npm run update-data
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const GITHUB_USER = 'nigrosimone';
const NPM_MAINTAINER = 'nigro.simone';
const DEVTO_USER = 'nigrosimone';
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT_DIR, 'src', 'app', 'data');
const PUBLIC_DIR = join(ROOT_DIR, 'public');

const HIDDEN_PROJECTS = new Set([]);

const HIDDEN_ARTICLES = new Set([]);

const HIDDEN_PACKAGES = new Set([
  'piffero',
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

const originalRepos = repos.filter((r) => !r.fork && r.name !== GITHUB_USER);
const npmPackageNames = new Set(packageNames);

// Progetti = repo originali con stelle, non archiviati e non nascosti. Selezione,
// descrizione (da GitHub) e link al pacchetto sono automatici: nessuna curatela.
const projects = originalRepos
  .filter((repo) => !repo.archived && repo.stargazers_count > 0 && !HIDDEN_PROJECTS.has(repo.name))
  .map((repo) => {
    const isPhp = repo.language === 'PHP';
    return {
      name: repo.name,
      description: repo.description ?? '',
      language: repo.language ?? 'TypeScript',
      stars: repo.stargazers_count,
      monthlyDownloads: isPhp ? undefined : downloadsByPackage.get(repo.name),
      repoUrl: repo.html_url,
      packageUrl: isPhp
        ? `https://packagist.org/packages/${GITHUB_USER}/codicefiscale`
        : npmPackageNames.has(repo.name)
          ? `https://www.npmjs.com/package/${repo.name}`
          : undefined,
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

// public/llms.txt: scheda leggibile dagli agenti AI, con gli stessi dati di sopra.
const fmt = (n) => n.toLocaleString('it-IT');
const projectLine = (p) => {
  const link = p.packageUrl ?? p.repoUrl;
  const desc = p.description ? `: ${p.description}` : '';
  const dl = p.monthlyDownloads ? `${fmt(p.monthlyDownloads)} download/mese, ` : '';
  const stars = `${p.stars} ${p.stars === 1 ? 'stella' : 'stelle'}`;
  return `- [${p.name}](${link})${desc} — ${dl}${stars}`;
};

const llmsTxt = `# Simone Nigro - Full-Stack Developer

> Portfolio personale di Simone Nigro, full-stack developer italiano (Avellino, Campania) in
> ACCA software S.p.A. Autore di librerie open source Angular e Node.js pubblicate su npm con
> oltre ${fmt(Math.floor(stats.npmMonthlyDownloads / 1000) * 1000)} download al mese. Sviluppa per il web dal 2000. Contributor
> del core di WordPress (5.5). Sito bilingue: italiano su /, inglese su /en/. Il sito espone i
> propri contenuti anche via WebMCP (navigator.modelContext): get_profile,
> list_open_source_projects, list_articles, get_contacts.

## Profilo

- Ruolo: Full-Stack Developer (Angular, TypeScript, Node.js, PHP, PostgreSQL)
- Azienda: ACCA software S.p.A.
- Località: Avellino, Campania, Italia
- Formazione: Laurea in Scienze della Comunicazione, Università degli Studi di Salerno
- Email: nigro.simone@gmail.com

## Progetti open source (dati npm/GitHub del ${formatDate(stats.updatedAt)})

${projects.map(projectLine).join('\n')}
- Totale: ${stats.npmPackages} pacchetti npm, ${fmt(stats.npmMonthlyDownloads)} download/mese, ${fmt(stats.githubStars)} stelle GitHub

## Collegamenti

- [GitHub](https://github.com/${GITHUB_USER}): ${stats.githubRepos} repository pubblici
- [npm](https://www.npmjs.com/~${NPM_MAINTAINER}): tutti i pacchetti
- [DEV Community](https://dev.to/${DEVTO_USER}): ${articles.length} articoli su Angular, Node.js e performance
- [LinkedIn](https://www.linkedin.com/in/simonenigro/): profilo professionale
- [WordPress.org](https://profiles.wordpress.org/${GITHUB_USER}/): contributi WordPress
`;

await writeFile(join(PUBLIC_DIR, 'llms.txt'), llmsTxt);

// public/sitemap.xml: aggiorna la data di ultimo aggiornamento (<lastmod>) di
// ogni URL con quella odierna, così i motori di ricerca sanno che il contenuto
// è cambiato dopo la rigenerazione dei dati.
const sitemapPath = join(PUBLIC_DIR, 'sitemap.xml');
const sitemap = await readFile(sitemapPath, 'utf8');
await writeFile(
  sitemapPath,
  sitemap.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${stats.updatedAt}</lastmod>`),
);

console.log(`✔ Dati aggiornati al ${formatDate(stats.updatedAt)}:`);
console.log(`  ${stats.npmPackages} pacchetti npm, ${stats.npmMonthlyDownloads} download/mese`);
console.log(`  ${stats.githubStars} stelle GitHub, ${articles.length} articoli dev.to`);
console.log('  Rigenerati: src/app/data/*.ts, public/llms.txt e public/sitemap.xml.');
console.log('Ricontrolla il diff prima del commit.');
