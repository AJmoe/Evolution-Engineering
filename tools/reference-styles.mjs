// Extracts computed type and colour styles from a reference page, and screenshots sections
// after slow scrolling so lazy sliders render.
// Usage: node tools/reference-styles.mjs <url> <outPrefix>
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2];
const prefix = process.argv[3] || 'storage/reference/styles';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 300) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 250));
  }
});
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const pick = (el) => {
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 60),
      text: (el.innerText || '').trim().slice(0, 50),
      font: s.fontFamily,
      size: s.fontSize,
      weight: s.fontWeight,
      lh: s.lineHeight,
      ls: s.letterSpacing,
      tt: s.textTransform,
      color: s.color,
      bg: s.backgroundColor,
    };
  };
  const sel = 'h1,h2,h3,h4,h5,h6,p,.sub-title,.btn,a.theme-btn,nav a,span,li';
  const seen = new Set();
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const p = pick(el);
    if (!p.text) continue;
    const key = [p.tag, p.font, p.size, p.weight, p.color, p.tt].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  const bgs = [...new Set([...document.querySelectorAll('section,div,header,footer,a,button')].map((e) => getComputedStyle(e).backgroundColor))];
  const fontFaces = [...document.styleSheets].flatMap((ss) => {
    try {
      return [...ss.cssRules].filter((r) => r.type === 5).map((r) => r.cssText.slice(0, 160));
    } catch {
      return [];
    }
  });
  const links = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).filter((h) => /font/i.test(h));
  return { out, bgs, fontFaces: [...new Set(fontFaces)].slice(0, 40), links };
});
await writeFile(`${prefix}.json`, JSON.stringify(info, null, 2));
await page.screenshot({ path: `${prefix}-full.png`, fullPage: true });
await browser.close();
