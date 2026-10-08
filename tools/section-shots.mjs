// Screenshots individual page sections by selector, at desktop or phone width.
// Usage: node tools/section-shots.mjs <path> <selector>... [--phone]
import { chromium } from '@playwright/test';
const args = process.argv.slice(2);
const phone = args.includes('--phone');
const [path, ...selectors] = args.filter((a) => a !== '--phone');
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:8080' + path, { waitUntil: 'networkidle' });
for (const [i, sel] of selectors.entries()) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const file = `storage/screenshots/section-${phone ? 'phone' : 'desktop'}-${i}.png`;
  await el.screenshot({ path: file });
  console.log(file, sel);
}
await browser.close();
