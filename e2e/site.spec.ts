import { expect, test } from '@playwright/test';

test('homepage renders the hero with Italian content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Simone Nigro/);
  await expect(page.locator('h1')).toHaveText('Simone Nigro');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByRole('heading', { name: /Chi sono/ })).toBeVisible();
});

test('English page renders translated content', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.sndesign.it/en/',
  );
});

test('content is visible without JavaScript (SSG)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.locator('h1')).toHaveText('Simone Nigro');
  await expect(page.locator('#progetti article.card').first()).toBeVisible();
  await context.close();
});

test('navigation anchor scrolls to the projects section with n cards', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-links a[href$="#progetti"]').click();
  await expect(page.locator('#progetti')).toBeInViewport();
  await expect(page.locator('#progetti article.card')).toHaveCount(11);
});

test('anchors on the English page stay on the English page', async ({ page }) => {
  await page.goto('/en/');
  await page.locator('.nav-links a[href$="#progetti"]').click();
  await expect(page.locator('#progetti')).toBeInViewport();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Il router normalizza /en/ in /en dopo l'hydration: accetta entrambe.
  await expect(page).toHaveURL(/\/en\/?(#|$)/);
});

test('language switch goes to the English version', async ({ page }) => {
  await page.goto('/');
  await page.locator('.lang-switch a[href="/en/"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(/\/en\/?(#|$)/);
});

test('agentic and SEO files are served', async ({ request }) => {
  for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt', 'humans.txt', 'og.png']) {
    const res = await request.get(`/${file}`);
    expect(res.status(), file).toBe(200);
  }
});

test('hero stats show formatted numbers', async ({ page }) => {
  await page.goto('/');
  const firstStat = page.locator('.hero-stats .stat-value').first();
  await expect(firstStat).not.toHaveText('0');
  await expect(firstStat).toHaveText(/\d{1,3}(\.\d{3})*/);
});
