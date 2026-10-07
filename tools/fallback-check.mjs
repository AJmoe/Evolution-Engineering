// Checks the hero fallbacks: reduced motion shows the still and stacked stages with no 3D,
// and a low-end device gets the cross-fading stills without downloading Three.js.
// Usage: node tools/fallback-check.mjs [baseUrl]
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const threeRequests = [];
  page.on('request', (r) => /three-common|hero-scene/.test(r.url()) && threeRequests.push(r.url()));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const s = await page.evaluate(() => ({
    film: document.querySelector('.hero').classList.contains('is-film'),
    stagesVisible: !document.querySelector('[data-hero-stages]').hidden,
    posterLoaded: document.querySelector('.hero__poster img').complete,
    trackHeight: document.querySelector('[data-hero-track]').offsetHeight,
  }));
  check(!s.film, 'reduced motion: no scroll film');
  check(s.stagesVisible, 'reduced motion: three stage panels shown as normal content');
  check(s.posterLoaded, 'reduced motion: handover still shown');
  check(s.trackHeight <= 1200, 'reduced motion: no tall scroll track');
  check(threeRequests.length === 0, 'reduced motion: no 3D download');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }));
  const threeRequests = [];
  page.on('request', (r) => /three-common|hero-scene/.test(r.url()) && threeRequests.push(r.url()));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.hero.is-ready', { timeout: 15000 });
  const stills = await page.$$eval('.hero__stills picture', (els) => els.length);
  check(stills === 3, 'low-end device: three stage stills in place');
  check(threeRequests.length === 0, 'low-end device: no 3D download');
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} check(s) failed` : 'All fallback checks passed');
process.exit(failures ? 1 : 0);
