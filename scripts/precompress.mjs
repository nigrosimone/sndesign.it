/**
 * Scrive accanto a ogni .js e .css della build una copia .br a qualità 11.
 * Apache la serve al posto dell'originale (vedi public/.htaccess): la compressione
 * al volo di Aruba usa una qualità più bassa.
 *
 * Uso: eseguito automaticamente in postbuild
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'portfolio', 'browser');

let count = 0;
for (const entry of readdirSync(outDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !/\.(js|css)$/.test(entry.name)) {
    continue;
  }
  const file = join(entry.parentPath, entry.name);
  const br = brotliCompressSync(readFileSync(file), {
    params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY },
  });
  writeFileSync(file + '.br', br);
  count++;
}
console.log(`Precompress: ${count} file .br in dist/portfolio/browser.`);
