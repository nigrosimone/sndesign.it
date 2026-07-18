# SN.DESIGN v4 — Simone Nigro's Portfolio

Personal portfolio of **Simone Nigro**, a full-stack developer from Avellino, Italy. Built with
**Angular 22** (zoneless, signals, standalone components) as a bilingual, statically generated
site with a cyber-minimal aesthetic. Successor to [sndesign.it/v3](https://www.sndesign.it/v3/).

🔗 **Live:** [www.sndesign.it](https://www.sndesign.it/)

## Highlights

- **Static site generation** (`outputMode: static`) — both `/` (Italian) and `/en/` (English)
  are fully prerendered HTML that render even with JavaScript disabled.
- **Self-updating content** — open-source projects, npm packages and articles are pulled live
  from the GitHub, npm and DEV Community public APIs by `scripts/update-data.mjs` and baked into
  the build. No CMS, no manual data entry: the project list, descriptions and stats all come
  straight from the sources.
- **Live stats** — npm downloads and GitHub stars refresh client-side on idle, gracefully
  falling back to the values baked at build time when offline.
- **Bilingual i18n** with [@jsverse/transloco](https://jsverse.gitbook.io/transloco/), optimized
  at build time via transloco-optimize.
- **AI-friendly (WebMCP)** — content is exposed to AI agents through Angular's experimental
  `provideExperimentalWebMcpTools` API and a generated `llms.txt`, alongside an hreflang sitemap
  and schema.org JSON-LD.
- **CSS-first animations** (glitch, typing, scroll-reveal, count-up) that honor
  `prefers-reduced-motion`; content stays visible without JS via `@media (scripting: enabled)`.
- **Strict quality gates** — type-checked ESLint + angular-eslint, Prettier, a Husky pre-commit
  hook, Vitest unit tests and Playwright end-to-end tests.

## Tech stack

Angular 22 · TypeScript · `@angular/ssr` (SSG) · Transloco · Vitest · Playwright · ESLint · Prettier

## Getting started

```bash
npm install
npm start            # dev server on http://localhost:4200
npm run build        # production build + prerender → dist/portfolio/browser
npm test             # unit tests (Vitest)
npm run e2e          # build + end-to-end tests (Playwright)
npm run lint         # ESLint (strict, type-checked) on TS and templates
npm run update-data  # refresh projects, articles and llms.txt from GitHub, npm and DEV.to
```

## Project structure

```text
src/app/
  components/       UI sections: hero, about, projects, articles, contact, header, site
  data/             generated data (open-source.ts, articles.ts) + curated site-data.ts + types
  directives/       count-up, scroll-reveal and reduced-motion helpers
  services/         live-stats — client-side npm/GitHub refresh
  webmcp-tools.ts   tools exposed to AI agents via WebMCP
scripts/
  update-data.mjs   regenerates the data files and public/llms.txt from public APIs
  optimize-i18n.mjs builds the optimized translations (runs in the pre* npm hooks)
public/             static assets, sitemap, robots, llms.txt, humans.txt
```

## How the data pipeline works

`scripts/update-data.mjs` runs automatically before `npm start` and `npm run build`. It:

1. Fetches the owner's repositories (GitHub), published packages (npm) and articles (DEV.to).
2. Selects the open-source projects to feature — original repos with stars, excluding archived
   and hidden ones — and orders them by star count.
3. Writes `src/app/data/open-source.ts`, `src/app/data/articles.ts` and `public/llms.txt`,
   formatted with the project's Prettier config so regenerations only diff on real data changes.

Because the data is regenerated from public sources, the numbers in the repo reflect the last
build rather than being hand-maintained.

## Deployment

The build output is fully static — deploy the contents of `dist/portfolio/browser/` to any host.
An `.htaccess` is included for Apache (Brotli/gzip compression, immutable caching for hashed
assets, no-cache for HTML, and an `/en → /en/` redirect).
