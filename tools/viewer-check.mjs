// Smoke test for the small-homes 3D viewer: it renders, switches designs and moods,
// rotates with the keyboard, and logs no console errors.
// Usage: node tools/viewer-check.mjs [baseUrl]
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'msedge',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
});
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(base + '/small-homes', { waitUntil: 'networkidle' });
const frame = page.locator('[data-home-viewer]');
await frame.scrollIntoViewIfNeeded();
await page.waitForSelector('[data-home-viewer].is-3d', { timeout: 20000 });
await page.waitForTimeout(800);

for (const slug of ['the-compact', 'the-family-two', 'the-courtyard']) {
  await page.click(`[data-design-tab="${slug}"]`);
  await page.waitForTimeout(900);
  await frame.screenshot({ path: `storage/screenshots/viewer-${slug}.png` });
  console.log('rendered', slug, '| label:', await page.getAttribute('.viewer__canvas', 'aria-label'));
}
await page.click('[data-mood="evening"]');
await page.waitForTimeout(700);
await frame.screenshot({ path: 'storage/screenshots/viewer-evening.png' });
await page.focus('.viewer__canvas');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
await frame.screenshot({ path: 'storage/screenshots/viewer-rotated.png' });
console.log('evening and keyboard rotation captured');

await page.goto(base + '/', { waitUntil: 'networkidle' });
const teaser = page.locator('[data-home-viewer]');
await teaser.scrollIntoViewIfNeeded();
await page.waitForSelector('[data-home-viewer].is-3d', { timeout: 20000 });
await page.waitForTimeout(800);
await teaser.screenshot({ path: 'storage/screenshots/viewer-home-teaser.png' });
console.log('homepage teaser rendered');

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No console errors');
await browser.close();
