// Smoke test for the homepage hero: the canvas renders, there are no console errors,
// and each stage shows its copy. Saves viewport screenshots at several scroll positions.
// Usage: node tools/hero-check.mjs [baseUrl] [desktop|phone]
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const mode = process.argv[3] || 'desktop';
const viewport = mode === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'msedge',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mode === 'phone', isMobile: mode === 'phone' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

// Report the device signals the tier choice sees, then force a capable profile so 3D runs in tests.
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
});
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForSelector('.hero.is-ready', { timeout: 20000 });
const usesCanvas = await page.$('.hero__canvas');
console.log(`${mode}: hero ready using ${usesCanvas ? '3D canvas' : 'stills'}`);

const trackSpan = await page.evaluate(() => {
  const t = document.querySelector('[data-hero-track]');
  return { top: t.getBoundingClientRect().top + window.scrollY, span: t.offsetHeight - window.innerHeight };
});
for (const p of [0, 0.15, 0.45, 0.6, 0.72, 1]) {
  await page.evaluate(({ y }) => window.scrollTo(0, y), { y: trackSpan.top + trackSpan.span * p });
  await page.waitForTimeout(1600);
  const active = await page.$eval('.hero__text.is-active', (el) => el.textContent.trim().slice(0, 40));
  await page.screenshot({ path: `storage/screenshots/hero-${mode}-${String(p).replace('.', '_')}.png` });
  console.log(`p=${p}  copy: "${active}..."`);
}
const stats = await page.evaluate(() => {
  const hero = document.querySelector('.hero');
  return { film: hero.classList.contains('is-film'), stagesHidden: document.querySelector('[data-hero-stages]').hidden };
});
console.log(stats);
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No console errors');
await browser.close();
