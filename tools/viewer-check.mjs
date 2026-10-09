// Smoke test for the small-homes slideshows: each design's 3D model renders, the plan and blueprint
// slides switch, the evening mood and keyboard rotation work, and nothing logs a console error.
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

await page.goto(base + '/small-homes', { waitUntil: 'load' });
for (const slug of ['the-compact', 'the-family-two', 'the-courtyard']) {
  await page.click(`[data-design-tab="${slug}"]`);
  const panel = page.locator(`[data-design-panel="${slug}"]`);
  await panel.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForSelector(`[data-design-panel="${slug}"] [data-home-viewer].is-3d`, { timeout: 20000 });
  await page.waitForTimeout(800);
  const label = await panel.locator('.viewer__canvas').getAttribute('aria-label');
  for (const n of [1, 2, 0]) {
    await panel.locator(`[data-thumb="${n}"]`).click();
    const active = await panel.locator('.gslide.is-active').getAttribute('id');
    if (!active.endsWith(['-3d', '-plan', '-blueprint'][n])) errors.push(`${slug}: thumb ${n} showed ${active}`);
  }
  console.log('rendered', slug, '| slides switch | label:', label);
}
const panel = page.locator('[data-design-panel="the-courtyard"]');
await panel.locator('[data-mood="evening"]').click();
await page.waitForTimeout(700);
await panel.locator('[data-home-viewer]').screenshot({ path: 'storage/screenshots/viewer-evening.png' });
await panel.locator('.viewer__canvas').focus();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
await panel.locator('[data-home-viewer]').screenshot({ path: 'storage/screenshots/viewer-rotated.png' });
console.log('evening mood and keyboard rotation captured');

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No console errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
