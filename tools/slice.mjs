// Slices a tall screenshot into viewable parts. Usage: node tools/slice.mjs <png> <outPrefix> [partHeight] [width]
import sharp from 'sharp';
const [file, prefix, ph = '1300', w = '1100'] = process.argv.slice(2);
const m = await sharp(file).metadata();
const step = Number(ph);
let i = 0;
for (let top = 0; top < m.height; top += step, i++) {
  const height = Math.min(step, m.height - top);
  await sharp(file).extract({ left: 0, top, width: m.width, height }).resize({ width: Math.min(Number(w), m.width) }).toFile(`${prefix}${i}.png`);
}
console.log(`${m.width}x${m.height} -> ${i} parts`);
