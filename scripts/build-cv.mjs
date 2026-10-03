/**
 * Genera il curriculum in PDF (italiano e inglese) con gli stessi dati del sito: testi da
 * src/i18n, esperienze e competenze da site-data.ts, numeri da open-source.ts e
 * contributions.ts. Chrome (Playwright) stampa l'HTML in public/simone-nigro-cv-<lang>.pdf.
 *
 * Uso: npm run cv (eseguito automaticamente in prebuild/prestart, dopo update-data)
 */
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT_DIR, 'public');

// Node importa i file .ts togliendo i tipi: i dati restano quelli del sito, senza copie.
const { EXPERIENCE, PROFILE, SKILL_GROUPS, SOCIALS } = await import('../src/app/data/site-data.ts');
const { OS_STATS, PROJECTS } = await import('../src/app/data/open-source.ts');
const { CONTRIBUTION_STATS, CONTRIBUTIONS } = await import('../src/app/data/contributions.ts');

const LOCALES = { it: 'it-IT', en: 'en-US' };
const PROJECTS_IN_CV = 6;

const LABELS = {
  it: {
    title: 'Curriculum Vitae',
    location: 'Avellino, Italia',
    profile: 'Profilo',
    experience: 'Esperienza',
    education: 'Formazione',
    skills: 'Competenze',
    openSource: 'Open source',
    contributions: 'Contributi open source',
    perMonth: 'download/mese',
    openSourceSum: (s, n) =>
      `${s.npmPackages} pacchetti npm, ${n(s.npmMonthlyDownloads)} download al mese, ${n(s.githubStars)} stelle su GitHub.`,
    contributionsSum: (s) =>
      `${s.mergedPullRequests} pull request mergiate in ${s.repos} progetti di altri, tra cui:`,
    updated: 'Aggiornato al',
    consent:
      'Autorizzo il trattamento dei miei dati personali ai sensi del D.Lgs. 196/2003 e del Regolamento UE 2016/679 (GDPR).',
  },
  en: {
    title: 'Curriculum Vitae',
    location: 'Avellino, Italy',
    profile: 'Profile',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    openSource: 'Open source',
    contributions: 'Open source contributions',
    perMonth: 'downloads/month',
    openSourceSum: (s, n) =>
      `${s.npmPackages} npm packages, ${n(s.npmMonthlyDownloads)} downloads per month, ${n(s.githubStars)} GitHub stars.`,
    contributionsSum: (s) =>
      `${s.mergedPullRequests} merged pull requests in ${s.repos} projects of other people, including:`,
    updated: 'Updated on',
    consent:
      'I authorize the processing of my personal data under Italian Legislative Decree 196/2003 and EU Regulation 2016/679 (GDPR).',
  },
};

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const get = (obj, key) => key.split('.').reduce((o, k) => o?.[k], obj);
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const font = (await readFile(join(PUBLIC_DIR, 'fonts', 'space-grotesk-latin.woff2'))).toString(
  'base64',
);
const avatar = (await readFile(join(PUBLIC_DIR, 'avatar.jpg'))).toString('base64');

function render(lang, i18n) {
  const l = LABELS[lang];
  const t = (key) => esc(get(i18n, key) ?? key);
  const num = (n) => new Intl.NumberFormat(LOCALES[lang]).format(n);
  const compact = (n) => new Intl.NumberFormat(LOCALES[lang], { notation: 'compact' }).format(n);
  const date = new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'long', timeZone: 'UTC' });
  const social = (label) => SOCIALS.find((s) => s.label === label).url;

  const links = [
    `<a href="mailto:${PROFILE.email}">${PROFILE.email}</a>`,
    ...[PROFILE.siteUrl, social('github'), social('linkedin'), social('dev.to')].map(
      (url) => `<a href="${url}">${esc(bare(url))}</a>`,
    ),
  ];

  const job = (j) => `
    <div class="job">
      <p class="when">${j.from} - ${j.to ?? t('about.present')}</p>
      <div>
        <h3>${t(`about.jobs.${j.id}.role`)} <span>· ${esc(j.company)}</span></h3>
        <p>${t(`about.jobs.${j.id}.desc`)}</p>
      </div>
    </div>`;

  const project = (p) => {
    // Non con get(): alcuni nomi contengono un punto (fulmine.js).
    const desc = i18n.projects.desc[p.name] ?? p.description;
    const downloads = p.monthlyDownloads ? ` · ${num(p.monthlyDownloads)} ${l.perMonth}` : '';
    return `
    <div class="project">
      <h3><a href="${p.packageUrl ?? p.repoUrl}">${esc(p.name)}</a></h3>
      <p>${esc(desc)}</p>
      <p class="meta">★ ${p.stars}${downloads}</p>
    </div>`;
  };

  // Le PR del sito raggruppate per repo, che arrivano già ordinati per stelle.
  const contribs = [...Map.groupBy(CONTRIBUTIONS, (c) => c.repo).values()].map(
    (prs) => `
    <div class="contrib">
      <h3><a href="${prs[0].repoUrl}">${esc(prs[0].repo)}</a> <span class="meta">★ ${compact(prs[0].stars)}</span></h3>
      <ul>${prs.map((pr) => `<li><a href="${pr.url}">${esc(pr.title)}</a> <a class="meta" href="${pr.url}">#${pr.number}</a></li>`).join('')}</ul>
    </div>`,
  );

  const sections = [
    [l.profile, `<p>${t('about.bio1')}</p><p>${t('about.bio2')}</p>`],
    [
      l.experience,
      EXPERIENCE.filter((j) => j.id !== 'degree')
        .map(job)
        .join(''),
    ],
    [
      l.education,
      EXPERIENCE.filter((j) => j.id === 'degree')
        .map(job)
        .join(''),
    ],
    [
      l.skills,
      `<dl class="skills">${SKILL_GROUPS.map(
        (g) => `<dt>${t(g.labelKey)}</dt><dd>${g.skills.map(esc).join(', ')}</dd>`,
      ).join('')}</dl>`,
    ],
    [
      l.openSource,
      `<p>${esc(l.openSourceSum(OS_STATS, num))}</p>
      <div class="projects">${PROJECTS.slice(0, PROJECTS_IN_CV).map(project).join('')}</div>`,
    ],
    [
      l.contributions,
      `<p>${esc(l.contributionsSum(CONTRIBUTION_STATS))}</p>${contribs.join('')}`,
      'long',
    ],
  ];

  // Il piè di pagina lo disegna Chrome su ogni pagina, con il numero di pagina.
  const footer = `<div style="width:100%;margin:0 16mm;display:flex;justify-content:space-between;font:7pt monospace;color:#6b7787">
    <span>${esc(PROFILE.name)} · ${esc(bare(PROFILE.siteUrl))} · ${l.updated} ${date.format(new Date(OS_STATS.updatedAt))}</span>
    <span><span class="pageNumber"></span>/<span class="totalPages"></span></span>
  </div>`;

  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${esc(PROFILE.name)} - ${l.title}</title>
<style>
  @font-face {
    font-family: 'Space Grotesk';
    font-weight: 300 700;
    src: url(data:font/woff2;base64,${font}) format('woff2');
  }
  @page { size: A4; margin: 14mm 16mm 16mm; }
  * { box-sizing: border-box; }
  :root { --accent: #00869c; --text: #18212d; --soft: #3d4a5a; --dim: #6b7787; --line: #d5dce4; }
  body { margin: 0; font: 9.6pt/1.5 'Space Grotesk', Arial, sans-serif; color: var(--text); }
  a { color: inherit; text-decoration: none; }
  p { margin: 0 0 0.5em; }
  .mono, .when, .meta, h2, header ul { font-family: 'Cascadia Code', Consolas, 'DejaVu Sans Mono', monospace; }
  header { display: flex; align-items: center; gap: 6mm; padding-bottom: 5mm; border-bottom: 1px solid var(--line); }
  header img { width: 26mm; height: 26mm; object-fit: cover; filter: grayscale(1); border: 1px solid var(--line); }
  h1 { margin: 0; font-size: 24pt; line-height: 1.1; font-weight: 600; letter-spacing: -0.01em; }
  .role { margin: 1mm 0 2.5mm; font-size: 11.5pt; color: var(--soft); }
  .role strong { color: var(--accent); font-weight: 600; }
  header ul { display: flex; flex-wrap: wrap; gap: 0.5mm 4mm; margin: 0; padding: 0; list-style: none; font-size: 7.8pt; color: var(--dim); }
  section { margin-top: 5mm; break-inside: avoid; }
  h2 { display: flex; align-items: center; gap: 2.5mm; margin: 0 0 2.5mm; font-size: 8.4pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; break-after: avoid; }
  h2 span { color: var(--accent); }
  h2::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  h3 { margin: 0 0 0.6mm; font-size: 10pt; font-weight: 600; }
  h3 span { color: var(--dim); font-weight: 400; }
  section > p, .job p, .project p { color: var(--soft); }
  .job { display: grid; grid-template-columns: 24mm 1fr; gap: 3mm; margin-bottom: 2.5mm; break-inside: avoid; }
  .when { margin: 0.6mm 0 0; font-size: 8pt; color: var(--accent); }
  .skills { display: grid; grid-template-columns: 34mm 1fr; gap: 1mm 3mm; margin: 0; }
  .skills dt { font-weight: 600; }
  .skills dd { margin: 0; color: var(--soft); }
  .projects { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; margin-top: 2mm; }
  .project { break-inside: avoid; }
  .project h3 a { color: var(--accent); }
  .project p { margin: 0; }
  .meta { font-size: 7.6pt; color: var(--dim); }
  .project .meta { margin-top: 0.6mm; }
  section.long { break-inside: auto; }
  .contrib { margin-top: 1.4mm; break-inside: avoid; }
  .contrib h3 a { color: var(--accent); }
  .contrib ul { margin: 0; padding-left: 4mm; font-size: 8.8pt; line-height: 1.4; color: var(--soft); }
  .contrib li::marker { color: var(--dim); }
  .consent { margin-top: 3mm; font-size: 7.6pt; color: var(--dim); break-inside: avoid; }
</style>
</head>
<body>
<header>
  <img src="data:image/jpeg;base64,${avatar}" alt="">
  <div>
    <h1>${esc(PROFILE.name)}</h1>
    <p class="role"><strong>${t('hero.role')}</strong> · ${t('hero.focus')}</p>
    <ul><li>${esc(l.location)}</li>${links.map((a) => `<li>${a}</li>`).join('')}</ul>
  </div>
</header>
${sections
  .map(
    ([title, body, cls], i) =>
      `<section${cls ? ` class="${cls}"` : ''}><h2><span>${String(i + 1).padStart(2, '0')}.</span> ${esc(title)}</h2>${body}</section>`,
  )
  .join('\n')}
<p class="consent">${esc(l.consent)}</p>
</body>
</html>`;

  return { html, footer };
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const lang of ['it', 'en']) {
  const i18n = JSON.parse(await readFile(join(ROOT_DIR, 'src', 'i18n', `${lang}.json`), 'utf8'));
  const { html, footer } = render(lang, i18n);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: join(PUBLIC_DIR, `simone-nigro-cv-${lang}.pdf`),
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer,
    tagged: true,
    outline: true,
  });
}
await browser.close();
console.log('✔ Curriculum generato: public/simone-nigro-cv-it.pdf e public/simone-nigro-cv-en.pdf');
