// Renders the social sharing image (public/images/og-default.png, 1200x630) from HTML,
// using the site's own fonts, logo and hero photo. Usage: npm run og
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFile, rm } from 'node:fs/promises';

const file = (p) => pathToFileURL(resolve(p)).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Roboto; font-weight: 900; src: url('${file('resources/fonts/roboto-latin-900-normal.woff2')}'); }
@font-face { font-family: Roboto; font-weight: 700; src: url('${file('resources/fonts/roboto-latin-700-normal.woff2')}'); }
@font-face { font-family: Barlow; font-weight: 500; src: url('${file('resources/fonts/barlow-latin-500-normal.woff2')}'); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; color: #fff; font-family: Barlow, sans-serif;
  background: #0b1930 url('${file('public/images/stock/building-glass-1200.webp')}') 70% 50% / cover; }
body::before { content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(6,38,72,.97) 0%, rgba(4,64,112,.9) 48%, rgba(1,96,157,.35) 100%); }
.lines { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)),
  linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)), linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1));
  background-size: 1px 100%; background-repeat: no-repeat; background-position: 10% 0, 50% 0, 90% 0; }
.wrap { position: absolute; left: 80px; top: 70px; right: 80px; }
img { width: 300px; display: block; margin-bottom: 56px; }
.kicker { font: 900 20px Roboto; letter-spacing: 10px; text-transform: uppercase; margin-bottom: 14px; }
h1 { font: 900 112px/1 Roboto; text-transform: uppercase; }
h1 span { color: transparent; -webkit-text-stroke: 2px rgba(255,255,255,.9); }
p { margin-top: 30px; font-size: 27px; max-width: 760px; color: rgba(255,255,255,.9); }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: 12px; display: flex; }
.bar i { flex: 1; } .bar i:nth-child(1) { background: #d4202a; } .bar i:nth-child(2) { background: #1a75b8; } .bar i:nth-child(3) { background: #8cc63f; }
</style></head><body><div class="lines"></div><div class="wrap">
<img src="${file('public/images/brand/logo-light.png')}" alt="">
<div class="kicker">Evolution in</div><h1>Engin<span>eering</span></h1>
<p>Civil, mechanical and electrical engineering contractor in Gaborone, Botswana. Since 2007.</p>
</div><div class="bar"><i></i><i></i><i></i></div></body></html>`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// Loaded from a file, not setContent: an about:blank page may not read local fonts and images.
const tmp = resolve('storage/cache/og.html');
await writeFile(tmp, html);
await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/images/og-default.png' });
await browser.close();
await rm(tmp);
console.log('public/images/og-default.png');
