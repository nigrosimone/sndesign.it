/**
 * Rigenera src/app/data/open-source.ts, articles.ts e contributions.ts
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

const HIDDEN_PROJECTS = new Set(['sndesign.it']);

const HIDDEN_ARTICLES = new Set([]);

const HIDDEN_PACKAGES = new Set([
  'piffero',
]);

// Contributi: PR mergiate su repo altrui con almeno MIN_CONTRIBUTION_STARS stelle.
const MIN_CONTRIBUTION_STARS = 500;
const PRS_PER_REPO = 5;

// Siti di benchmark e liste awesome: non sono contributi al codice di una libreria.
const HIDDEN_CONTRIBUTION_REPOS_RE = /bench|awesome/i;

const HIDDEN_CONTRIBUTION_REPOS = new Set([]);

// Formato "owner/repo#numero".
const HIDDEN_PULL_REQUESTS = new Set([]);

async function fetchJson(url) {
  const headers = { accept: 'application/json' };
  // In CI il GITHUB_TOKEN alza i limiti, e va mandato solo alle API GitHub.
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  let res = await fetch(url, { headers });
  // La search API di GitHub senza token accetta 10 richieste al minuto: aspetta il reset e riprova.
  const resetIn = Number(res.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
  if (!res.ok && res.headers.get('x-ratelimit-remaining') === '0' && resetIn < 61_000) {
    console.log(`Limite API GitHub raggiunto, attendo ${Math.ceil(resetIn / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, resetIn + 1000));
    res = await fetch(url, { headers });
  }
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

// La search API restituisce al massimo 1000 risultati, 100 per pagina.
const prQuery = `is:pr is:merged author:${GITHUB_USER} -user:${GITHUB_USER}`;
const mergedPrs = [];
let mergedPrsTotal = Infinity;
for (let page = 1; mergedPrs.length < Math.min(mergedPrsTotal, 1000); page++) {
  const res = await fetchJson(
    `https://api.github.com/search/issues?q=${encodeURIComponent(prQuery)}&per_page=100&page=${page}`,
  );
  mergedPrsTotal = res.total_count;
  mergedPrs.push(...res.items);
  if (res.items.length === 0) break;
}
const prsByRepo = Map.groupBy(mergedPrs, (pr) => pr.repository_url.split('/repos/')[1]);

// Stelle con una ricerca ogni 50 repo, invece di una chiamata per repo.
const starsByRepo = new Map();
const contributedRepos = [...prsByRepo.keys()];
for (let i = 0; i < contributedRepos.length; i += 50) {
  const q = contributedRepos.slice(i, i + 50).map((r) => `repo:${r}`).join(' ') + ' fork:true';
  const res = await fetchJson(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100`,
  );
  for (const r of res.items) {
    starsByRepo.set(r.full_name, r.stargazers_count);
  }
}

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

// Rango dal titolo: 0 fix e perf, 1 feat, null il resto (manutenzione, titoli troppo corti).
const LOW_VALUE_PR =
  /\b(chore|docs?|tests?|ci|benchmarks?|typos?|readme|bump|deps|dependencies|update|upgrade|rename|devcontainer)\b/i;
const prRank = (title) => {
  if (title.split(' ').length < 4 || LOW_VALUE_PR.test(title)) return null;
  if (/\b(fix|perf|optimi[sz]|faster|crash|hang|leak)/i.test(title)) return 0;
  if (/\b(feat|add|support)/i.test(title)) return 1;
  return null;
};

// Lista piatta: repo per stelle, poi al massimo PRS_PER_REPO PR per repo.
const contributions = [...prsByRepo]
  .map(([repo, prs]) => ({ repo, prs, stars: starsByRepo.get(repo) ?? 0 }))
  .filter(
    ({ repo, stars }) =>
      stars >= MIN_CONTRIBUTION_STARS &&
      !HIDDEN_CONTRIBUTION_REPOS_RE.test(repo) &&
      !HIDDEN_CONTRIBUTION_REPOS.has(repo),
  )
  .sort((a, b) => b.stars - a.stars)
  .flatMap(({ repo, prs, stars }) =>
    prs
      .map((pr) => ({
        repo,
        repoUrl: `https://github.com/${repo}`,
        stars,
        number: pr.number,
        title: pr.title.replace(/\s+/g, ' ').trim(),
        url: pr.html_url,
        date: pr.pull_request.merged_at.slice(0, 10),
      }))
      .filter((pr) => prRank(pr.title) !== null && !HIDDEN_PULL_REQUESTS.has(`${repo}#${pr.number}`))
      .sort((a, b) => prRank(a.title) - prRank(b.title) || b.date.localeCompare(a.date))
      .slice(0, PRS_PER_REPO),
  );

const contributionStats = {
  mergedPullRequests: mergedPrsTotal,
  repos: prsByRepo.size,
  searchUrl: `https://github.com/search?type=pullrequests&q=${encodeURIComponent(prQuery)}`,
};

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

const contributionsFile = `// Pull request mergiate su progetti di altri (API pubblica GitHub, ${formatDate(stats.updatedAt)}).
// Per aggiornarle: npm run update-data (rigenera questo file).
import type { Contribution, ContributionStats } from './types';

export const CONTRIBUTIONS: readonly Contribution[] = ${ts(contributions)};

export const CONTRIBUTION_STATS: ContributionStats = ${ts(contributionStats)};
`;

async function writeFormatted(fileName, source) {
  const filePath = join(DATA_DIR, fileName);
  const config = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(source, { ...config, filepath: filePath });
  await writeFile(filePath, formatted);
}

await writeFormatted('open-source.ts', openSourceFile);
await writeFormatted('articles.ts', articlesFile);
await writeFormatted('contributions.ts', contributionsFile);

// public/llms.txt: scheda leggibile dagli agenti AI, con gli stessi dati di sopra.
const fmt = (n) => n.toLocaleString('it-IT');
const projectLine = (p) => {
  const link = p.packageUrl ?? p.repoUrl;
  const desc = p.description ? `: ${p.description}` : '';
  const dl = p.monthlyDownloads ? `${fmt(p.monthlyDownloads)} download/mese, ` : '';
  const stars = `${p.stars} ${p.stars === 1 ? 'stella' : 'stelle'}`;
  return `- [${p.name}](${link})${desc} - ${dl}${stars}`;
};
const contributionLine = (c) =>
  `- [${c.title}](${c.url}) su [${c.repo}](${c.repoUrl}) (${fmt(c.stars)} stelle)`;

const llmsTxt = `# Simone Nigro - Full-Stack Developer

> Portfolio personale di Simone Nigro, full-stack developer italiano (Avellino, Campania) in
> ACCA software S.p.A. Autore di librerie open source Angular e Node.js pubblicate su npm con
> oltre ${fmt(Math.floor(stats.npmMonthlyDownloads / 1000) * 1000)} download al mese. Programma dal 1999, sviluppatore dal 2004. Contributor
> del core di WordPress (5.5). Sito bilingue: italiano su /, inglese su /en/. Il sito espone i
> propri contenuti anche via WebMCP (navigator.modelContext): get_profile,
> list_open_source_projects, list_contributions, list_articles, get_contacts.

## Profilo

- Ruolo: Full-Stack Developer (Angular, TypeScript, Node.js, PHP, PostgreSQL)
- Azienda: ACCA software S.p.A. (dal 2011, guida il team web)
- Esperienze precedenti: programmatore web in Estrogeni srl (2010-2011), insegnante di informatica all'ITI Sarrocchi di Siena (2009-2010), web developer freelance con il marchio SN.DESIGN (2004-2011)
- Località: Avellino, Campania, Italia
- Formazione: Laurea in Scienze della Comunicazione, Università degli Studi di Salerno
- Email: nigro.simone@gmail.com

## Progetti open source (dati npm/GitHub del ${formatDate(stats.updatedAt)})

${projects.map(projectLine).join('\n')}
- Totale: ${stats.npmPackages} pacchetti npm, ${fmt(stats.npmMonthlyDownloads)} download/mese, ${fmt(stats.githubStars)} stelle GitHub

## Contributi ad altri progetti open source

${contributions.map(contributionLine).join('\n')}
- Totale: [${contributionStats.mergedPullRequests} pull request mergiate](${contributionStats.searchUrl}) in ${contributionStats.repos} repository di altri

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
console.log(`  ${contributionStats.mergedPullRequests} PR mergiate su progetti di altri`);
console.log('  Rigenerati: src/app/data/*.ts, public/llms.txt e public/sitemap.xml.');
console.log('Ricontrolla il diff prima del commit.');
