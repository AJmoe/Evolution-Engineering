// Renders a still of each concept home from the live 3D viewer, for posters, cards and no-JS visitors.
// Needs the local site running. Usage: node tools/home-stills.mjs [baseUrl]
//   -> public/images/homes/<slug>-3d.webp (1200 x 900) and <slug>-3d-sm.webp (600 x 450)
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const slugs = ['the-compact', 'the-family-two', 'the-courtyard'];
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
// bypassCSP: the overlay-hiding style tag below is inline, which the site's CSP blocks.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, bypassCSP: true });
for (const slug of slugs) {
  await page.goto(`${base}/small-homes/${slug}?still=1`, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('[data-home-viewer]').scrollIntoView({ block: 'center' }));
  await page.waitForSelector('[data-home-viewer].is-3d', { timeout: 30000 });
  // Hide the overlays, fix the camera angle, then capture only the canvas area.
  await page.addStyleTag({ content: '[data-home-viewer] .tag, [data-home-viewer] .mood-toggle { display: none !important; }' });
  await page.evaluate(() => document.querySelector('[data-home-viewer]').__viewer.pose(-0.55, 0.24));
  await page.waitForTimeout(1500);
  const clip = await page.evaluate(() => {
    const r = document.querySelector('[data-home-viewer]').getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const png = await page.screenshot({ clip });
  await sharp(png).resize(1200, 900, { fit: 'cover' }).webp({ quality: 80 }).toFile(`public/images/homes/${slug}-3d.webp`);
  await sharp(png).resize(600, 450, { fit: 'cover' }).webp({ quality: 78 }).toFile(`public/images/homes/${slug}-3d-sm.webp`);
  console.log(slug);
}
await browser.close();
