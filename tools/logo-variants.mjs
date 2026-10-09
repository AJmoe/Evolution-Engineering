// Builds the logo files the site uses from the client's logo PNG (drawn on white):
// a transparent colour mark and a reversed mark for dark backgrounds, both without the tagline.
// Usage: node tools/logo-variants.mjs [resources/images/logo-source.png]
import sharp from 'sharp';

const src = process.argv[2] || 'resources/images/logo-source.png';
const out = 'public/images/brand';
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

// Knock out the white background: alpha from distance to white, then un-blend the colour.
const color = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const a = Math.min(1, ((255 - Math.min(r, g, b)) / 255) * 1.8);
  if (a < 0.02) continue;
  const un = (c) => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - a)) / a)));
  color.set([un(r), un(g), un(b), Math.round(a * 255)], i);
}

// The tagline sits below the wordmark, separated by empty rows.
const rowFilled = (y) => {
  for (let x = 0; x < width; x++) if (color[(y * width + x) * 4 + 3] > 30) return true;
  return false;
};
let y = Math.floor(height * 0.6);
while (y < height && rowFilled(y)) y++;
const crop = { left: 0, top: 0, width, height: y };
const raw = { raw: { width, height, channels: 4 } };

await sharp(await sharp(color, raw).extract(crop).png().toBuffer()).trim().png({ compressionLevel: 9 }).toFile(`${out}/logo.png`);

// Reversed: blue lettering to white, grey gear to pale grey. Green gears and the red stay.
const rev = Buffer.from(color);
for (let i = 0; i < rev.length; i += 4) {
  const [r, g, b, a] = [rev[i], rev[i + 1], rev[i + 2], rev[i + 3]];
  if (a < 10) continue;
  if (b > r + 40 && b > g + 10) rev.set([255, 255, 255], i);
  else if (Math.abs(r - g) < 22 && Math.abs(g - b) < 22) rev.set([200, 208, 220], i);
}
await sharp(await sharp(rev, raw).extract(crop).png().toBuffer()).trim().png({ compressionLevel: 9 }).toFile(`${out}/logo-light.png`);
const m = await sharp(`${out}/logo.png`).metadata();
console.log(`mark ${m.width}x${m.height}, tagline cut at ${y}px`);
