// Production audit crawler: visits every internal page (from links and the sitemap) plus edge-case URLs,
// and reports metadata, headings, images, links, console errors and failed requests.
// Usage: node tools/audit-crawl.mjs [baseUrl]  -> storage/audit/crawl.json and a summary on stdout
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const EDGE = [
  '/this-page-does-not-exist',
  '/services/not-a-service',
  '/projects/not-a-project',
  '/small-homes/not-a-home',
  '/projects?type=roads&year=2025',
  '/projects?q=zzzzzz',
  '/projects?type=bogus&year=1900',
  '/contact?design=the-compact',
  '/contact?type=supplies&item=Gate%20valves',
  '/contact?email=not-an-email',
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const queue = [...new Set(['/', ...fromSitemap, ...EDGE])];
const seen = new Set();
const pages = [];
const allLinks = new Map(); // href -> set of pages

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const failed = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => consoleMsgs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => !r.url().includes('google') && failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && r.url() !== base + path && failed.push(`${r.status()} ${r.url()}`));
  const res = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  // Scroll through so lazy images load, then let them settle.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const meta = (n) => q(`meta[name="${n}"]`)?.content ?? q(`meta[property="${n}"]`)?.content ?? null;
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      level: Number(h.tagName[1]),
      text: h.textContent.replace(/\s+/g, ' ').trim().slice(0, 70),
      hidden: !h.offsetParent && getComputedStyle(h).position !== 'fixed',
    }));
    const skips = [];
    let prev = 0;
    for (const h of headings) {
      if (prev && h.level > prev + 1) skips.push(`h${prev} -> h${h.level} "${h.text}"`);
      prev = h.level;
    }
    const imgs = [...document.images].map((i) => ({
      src: i.currentSrc || i.src,
      alt: i.getAttribute('alt'),
      w: i.getAttribute('width'),
      h: i.getAttribute('height'),
      broken: i.complete && i.naturalWidth === 0 && !!i.getAttribute('src'),
      inViewer: !!i.closest('[aria-hidden="true"]'),
    }));
    const links = [...document.querySelectorAll('a[href]')].map((a) => ({
      href: a.getAttribute('href'),
      text: (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 50),
      target: a.target,
      rel: a.rel,
    }));
    const unnamed = [...document.querySelectorAll('button, a[href], [role="button"]')]
      .filter((el) => !(el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.querySelector('img[alt]:not([alt=""])')))
      .map((el) => el.outerHTML.slice(0, 120));
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    const clickDivs = [...document.querySelectorAll('div[onclick], span[onclick]')].length;
    return {
      title: document.title,
      description: meta('description'),
      canonical: q('link[rel="canonical"]')?.href ?? null,
      robots: meta('robots'),
      og: { title: meta('og:title'), description: meta('og:description'), image: meta('og:image'), url: meta('og:url'), type: meta('og:type') },
      twitter: { card: meta('twitter:card'), title: meta('twitter:title'), description: meta('twitter:description'), image: meta('twitter:image') },
      lang: document.documentElement.lang,
      h1: headings.filter((h) => h.level === 1).map((h) => h.text),
      skips,
      imgs,
      links,
      unnamed,
      dupIds,
      clickDivs,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      text: document.body.innerText,
    };
  });
  const placeholderHits = (info.text.match(/lorem|ipsum|coming soon|under construction|TODO|FIXME|sample|example\.com|we are confirming/gi) || []).slice(0, 5);
  delete info.text;
  pages.push({ path, status: res.status(), ...info, console: consoleMsgs, failed, placeholderHits });
  for (const l of info.links) {
    if (!allLinks.has(l.href)) allLinks.set(l.href, new Set());
    allLinks.get(l.href).add(path);
    if (l.href.startsWith('/') && !l.href.startsWith('//')) {
      const u = new URL(l.href, base);
      const key = u.pathname + u.search;
      if (!seen.has(key) && !u.pathname.match(/\.(svg|png|webp|xml|txt)$/)) queue.push(key);
    }
  }
  await page.close();
}
await browser.close();

// Check every distinct link target.
const linkStatus = {};
for (const href of allLinks.keys()) {
  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    linkStatus[href] = 'scheme';
    continue;
  }
  if (href === '#' || href.startsWith('javascript:')) {
    linkStatus[href] = 'FAKE';
    continue;
  }
  if (href.startsWith('#')) {
    linkStatus[href] = 'anchor';
    continue;
  }
  const url = new URL(href, base).href;
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 audit' }, signal: AbortSignal.timeout(15000) });
    linkStatus[href] = r.status;
  } catch (e) {
    linkStatus[href] = `ERR ${e.message}`;
  }
}

await mkdir('storage/audit', { recursive: true });
await writeFile('storage/audit/crawl.json', JSON.stringify({ pages, linkStatus, linkPages: Object.fromEntries([...allLinks].map(([k, v]) => [k, [...v]])) }, null, 2));

// Summary
const dup = (key) => {
  const m = new Map();
  for (const p of pages.filter((p) => p.status === 200)) m.set(p[key], [...(m.get(p[key]) || []), p.path]);
  return [...m].filter(([, v]) => v.length > 1);
};
console.log(`Pages: ${pages.length}`);
for (const p of pages) {
  const issues = [];
  if (p.h1.length !== 1) issues.push(`h1 x${p.h1.length}`);
  if (p.skips.length) issues.push(`skips: ${p.skips.join('; ')}`);
  if (!p.description) issues.push('no description');
  else if (p.description.length > 165 || p.description.length < 70) issues.push(`desc ${p.description.length} chars`);
  if (p.title.length > 65) issues.push(`title ${p.title.length} chars`);
  if (!p.canonical) issues.push('no canonical');
  const noAlt = p.imgs.filter((i) => i.alt === null);
  if (noAlt.length) issues.push(`img no alt x${noAlt.length}`);
  const noDim = p.imgs.filter((i) => !i.w || !i.h);
  if (noDim.length) issues.push(`img no size x${noDim.length}: ${noDim.map((i) => i.src.split('/').pop()).slice(0, 3).join(',')}`);
  const broken = p.imgs.filter((i) => i.broken);
  if (broken.length) issues.push(`BROKEN img ${broken.map((i) => i.src).join(',')}`);
  if (p.unnamed.length) issues.push(`unnamed controls x${p.unnamed.length}`);
  if (p.dupIds.length) issues.push(`dup ids ${p.dupIds.join(',')}`);
  if (p.console.length) issues.push(`console: ${p.console.join(' | ')}`);
  if (p.failed.length) issues.push(`failed: ${p.failed.join(' | ')}`);
  if (p.placeholderHits.length) issues.push(`placeholder text: ${p.placeholderHits.join(',')}`);
  if (p.overflow > 0) issues.push(`overflow ${p.overflow}`);
  if (!p.twitter.title) issues.push('no twitter:title');
  console.log(`${p.status} ${p.path}  "${p.title}"${issues.length ? '\n    - ' + issues.join('\n    - ') : ''}`);
}
console.log('\nDuplicate titles:', JSON.stringify(dup('title')));
console.log('Duplicate descriptions:', JSON.stringify(dup('description')));
console.log('\nLink problems:');
for (const [href, s] of Object.entries(linkStatus)) {
  if (s === 'scheme' || s === 'anchor' || s === 200) continue;
  console.log(`  ${s}  ${href}  (on ${[...allLinks.get(href)].slice(0, 3).join(', ')})`);
}
