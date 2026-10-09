// Normalises downloaded client logos into public/images/clients/<name>.png: transparent background,
// trimmed, 120 px tall (shown at 60 px). Usage: node tools/client-logos.mjs <dir with raw PNGs>
// Sources are listed in IMAGE_CREDITS.md. Logos remain the property of each organisation.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const src = process.argv[2];
const out = 'public/images/clients';
await mkdir(out, { recursive: true });

// Knock out a near-white background (alpha from distance to white).
async function knockWhite(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    if (min > 235) data[i + 3] = Math.round(data[i + 3] * ((255 - min) / 20));
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

// Debswana: white artwork for dark backgrounds, with a campaign slogan on the right.
// Keep the wordmark and hexagons, and turn them navy.
async function debswana(input) {
  const meta = await sharp(input).metadata();
  const cut = await sharp(input).extract({ left: 0, top: 0, width: Math.round(meta.width * 0.6), height: meta.height }).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { data, info } = cut;
  for (let i = 0; i < data.length; i += 4) data.set([23, 43, 86], i);
  return sharp(data, { raw: info }).png().toBuffer();
}

const jobs = {
  debswana: debswana,
  wuc: (f) => f,
  morupule: (f) => f,
  bdc: knockWhite,
  burs: (f) => f,
  bpc: (f) => f,
};
for (const [name, prep] of Object.entries(jobs)) {
  const input = await prep(`${src}/${name}.png`);
  const trimmed = await sharp(await sharp(input).trim().png().toBuffer())
    .resize({ height: 120, width: 420, fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(`${out}/${name}.png`);
  console.log(name, `${trimmed.width}x${trimmed.height}`);
}
