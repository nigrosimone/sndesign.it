/**
 * Screenshot di sviluppo: naviga il sito servito su 127.0.0.1:4173,
 * scrolla le sezioni (innescando le animazioni di reveal) e salva i PNG.
 *
 * Uso: node scripts/dev-screenshots.mjs <cartella-output>
 */
import { chromium } from '@playwright/test';

const outDir = process.argv[2] ?? '.';
const base = 'http://127.0.0.1:4173';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto(`${base}/`, { waitUntil: 'networkidle' });

const sections = [
  ['about', 'chi-sono'],
  ['projects', 'progetti'],
  ['articles', 'articoli'],
  ['contact', 'contatti'],
];

for (const [, id] of sections) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
}
for (const [name, id] of sections) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/pw-${name}.png` });
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${base}/`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(2200);
await mobile.screenshot({ path: `${outDir}/pw-mobile-hero.png` });
await mobile.locator('#progetti').scrollIntoViewIfNeeded();
await mobile.waitForTimeout(900);
await mobile.screenshot({ path: `${outDir}/pw-mobile-projects.png` });

await browser.close();
console.log('Screenshot salvati in', outDir);
