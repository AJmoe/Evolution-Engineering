// Captures a reference website for design study: full-page screenshots at desktop and phone
// widths, plus an outline of its sections, headings and navigation.
// Usage: node tools/reference-capture.mjs <url> <outPrefix>
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2];
const prefix = process.argv[3] || 'storage/reference/ref';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  // Scroll through so lazy content and scroll animations trigger.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${prefix}-${name}.png`, fullPage: true });
  if (name === 'desktop') {
    const outline = await page.evaluate(() => {
      const text = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
      const nav = [...document.querySelectorAll('header a')].map(text).filter(Boolean).slice(0, 40);
      const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => `${h.tagName} ${text(h)}`).filter((t) => t.length > 3);
      const sections = [...document.querySelectorAll('section, .elementor-top-section')]
        .map((s) => ({ cls: (s.className || '').toString().slice(0, 90), h: s.offsetHeight, text: text(s).slice(0, 220) }))
        .filter((s) => s.h > 80);
      const fonts = [...new Set([...document.querySelectorAll('h1,h2,p,a')].slice(0, 60).map((e) => getComputedStyle(e).fontFamily))];
      return { title: document.title, height: document.body.scrollHeight, nav, headings, sections, fonts };
    });
    await writeFile(`${prefix}-outline.json`, JSON.stringify(outline, null, 2));
    console.log(`height ${outline.height}px, ${outline.sections.length} sections, ${outline.headings.length} headings`);
  }
  await page.close();
}
await browser.close();
