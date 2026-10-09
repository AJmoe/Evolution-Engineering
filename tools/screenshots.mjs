// Captures full-page screenshots of key pages at desktop and phone widths, and reports console errors.
// Usage: node tools/screenshots.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const out = process.argv[3] || 'storage/screenshots';
const pages = ['/', '/about', '/services', '/services/civil-engineering', '/projects', '/projects/masama-mmamashia-transmission-pipeline', '/supplies', '/plant-and-equipment', '/small-homes', '/contact'];
const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
let problems = 0;
for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  for (const path of pages) {
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') {
        problems += 1;
        console.log(`[console ${size.name} ${path}] ${m.text()}`);
      }
    });
    page.on('pageerror', (e) => {
      problems += 1;
      console.log(`[pageerror ${size.name} ${path}] ${e.message}`);
    });
    // Not 'networkidle' or 'load': the Google Maps embed can keep both waiting.
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) {
      problems += 1;
      console.log(`[overflow ${size.name} ${path}] page is ${overflow}px wider than the viewport`);
    }
    const file = `${out}/${size.name}${path === '/' ? '-home' : path.replaceAll('/', '-')}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved', file);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} problem(s) found` : 'No console errors or horizontal overflow');
