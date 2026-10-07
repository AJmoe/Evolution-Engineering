// Renders the hero poster, the three stage stills and the social image from the live scene.
// Never hand-edit the output; rerun this whenever the scene changes.
// Usage: npm run stills   (needs the local site running with APP_NOINDEX=true)
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8080';
const outDir = 'public/images/hero';

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'msedge',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${base}/?render-stills=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__eeStills !== undefined, null, { timeout: 30000 });
const shots = await page.evaluate(async () => await window.__eeStills);
await browser.close();

await mkdir(outDir, { recursive: true });
for (const [name, dataUrl] of Object.entries(shots)) {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const file = name === 'og.png' ? 'public/images/og-default.png' : `${outDir}/${name}`;
  await writeFile(file, buf);
  const { size } = await stat(file);
  console.log(`${file}  ${(size / 1024).toFixed(1)} KB`);
}
