/**
 * Genera src/i18n/optimized/ dai file di traduzione sorgente applicando
 * Transloco Optimize (flatten delle chiavi + rimozione commenti + minify).
 * Il TranslocoStaticLoader importa i file ottimizzati.
 *
 * Uso: npm run i18n:optimize (eseguito automaticamente in prebuild/pretest)
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getTranslationFiles, optimizeFiles } = require(
  '@jsverse/transloco-optimize/src/lib/transloco-optimize',
);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = join(root, 'src', 'i18n');
const outDir = join(i18nDir, 'optimized');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const lang of ['it', 'en']) {
  cpSync(join(i18nDir, `${lang}.json`), join(outDir, `${lang}.json`));
}

const files = await getTranslationFiles('src/i18n/optimized');
await optimizeFiles(files, 'comment');
console.log(`Transloco Optimize: ${files.length} file ottimizzati in src/i18n/optimized.`);
