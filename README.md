# SN.DESIGN v4 - Portfolio di Simone Nigro

Sito personale in **Angular 22** (zoneless, signals, standalone): SSG bilingue con stile
cyber-minimal. Successore di [sndesign.it/v3](https://www.sndesign.it/v3/).

## Caratteristiche

- **SSG / prerendering statico** (`outputMode: static`): `/` (italiano) e `/en/` (inglese)
  sono HTML completi, funzionanti anche senza JavaScript
- **i18n** con [@jsverse/transloco](https://jsverse.gitbook.io/transloco/) (`TranslocoDirective`)
  e traduzioni ottimizzate in prebuild con transloco-optimize (`src/i18n/optimized/`, generata)
- **WebMCP**: contenuti esposti agli agenti AI con l'API sperimentale di Angular
  (`provideExperimentalWebMcpTools`) + `llms.txt`, sitemap con hreflang, JSON-LD schema.org
- **Stats live**: download npm e stelle GitHub aggiornati via fetch in idle,
  con fallback ai dati statici della build (`src/app/data/`)
- **Animazioni** CSS-first (glitch, typing, reveal, contatori) che rispettano
  `prefers-reduced-motion`; contenuti visibili senza JS grazie a `@media (scripting: enabled)`
- **Qualità**: ESLint strict type-checked + angular-eslint, Husky pre-commit (lint + test),
  unit test Vitest, e2e Playwright

## Comandi

```bash
npm start            # dev server (genera prima le traduzioni ottimizzate)
npm run build        # build di produzione + prerendering in dist/portfolio/browser
npm test             # unit test (Vitest)
npm run e2e          # build + test end-to-end (Playwright, canale Chrome)
npm run lint         # ESLint strict su TS e template
npm run update-data  # rigenera src/app/data/{open-source,articles}.ts dalle API pubbliche
```

## Deploy

La build è statica: carica il contenuto di `dist/portfolio/browser/` su qualunque hosting.
Per Apache è incluso `.htaccess` (compressione Brotli/gzip, cache immutable per gli asset
con hash, no-cache per l'HTML, redirect `/en → /en/`).

Se cambia il dominio (oggi `https://www.sndesign.it/`), aggiornare: `src/index.html`
(canonical, hreflang, Open Graph, JSON-LD), `src/app/components/site/site.ts` (`SITE_URL`),
`public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`.
