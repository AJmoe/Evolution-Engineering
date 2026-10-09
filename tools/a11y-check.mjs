// Runs axe-core (WCAG 2.1 A and AA rules) on key pages at desktop and phone widths.
// Usage: node tools/a11y-check.mjs [baseUrl]
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const pages = ['/', '/about', '/services', '/services/civil-engineering', '/projects', '/projects/masama-mmamashia-transmission-pipeline', '/supplies', '/plant-and-equipment', '/small-homes', '/contact', '/privacy'];
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
let total = 0;
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  // bypassCSP lets the axe script run; the site's CSP blocks injected inline scripts.
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', bypassCSP: true });
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    // Reveal animations would make axe judge half-faded text; show everything first.
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in')));
    await page.addScriptTag({ content: axe });
    const result = await page.evaluate(async () =>
      window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
    );
    for (const v of result.violations) {
      total += v.nodes.length;
      console.log(`[${viewport.width}] ${path} ${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log('    ', n.target.join(' '), '|', (n.failureSummary || '').split('\n')[1]?.trim() ?? '');
    }
  }
  await page.close();
}
await browser.close();
console.log(total ? `${total} issue(s)` : 'No axe violations');
