// Adds the client's own site photos to the image catalog, alongside the interim stock set.
// Originals are kept in resources/images/site (metadata, including location, stripped) and served
// through the same responsive pipeline as the stock photos, marked "own" so they carry no
// placeholder marker, "Illustrative photo" tag or credits-page entry.
// Usage: node tools/site-photos.mjs [folder of new originals]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

// Published key -> [original file name as supplied, description]
const PHOTOS = {
    'site-road-convoy': [
        'WhatsApp Image 2026-10-13 at 14.35.17 (2).jpeg',
        'Tipper EVO-16 feeding the paver on a town road',
    ],
    'site-rural-overlay': ['WhatsApp Image 2026-10-13 at 14.35.20.jpeg', 'Paver and tipper on a rural road overlay'],
    'site-paver-crew': ['WhatsApp Image 2026-10-13 at 14.35.21.jpeg', 'Paving crew behind the Uniter paver'],
    'site-paver-closeup': ['WhatsApp Image 2026-10-13 at 14.35.16 (1).jpeg', 'Crew member beside the Uniter paver'],
    'site-asphalt-raking': ['WhatsApp Image 2026-10-13 at 14.35.17 (1).jpeg', 'Crew raking asphalt behind the paver'],
    'site-failed-section': [
        'WhatsApp Image 2026-10-13 at 14.35.20 (2).jpeg',
        'Failed road section broken out for reconstruction',
    ],
    'site-asphalt-plant': ['WhatsApp Image 2026-10-13 at 14.35.19 (1).jpeg', 'Asphalt plant loading a tipper'],
    'site-plant-stack': ['WhatsApp Image 2026-10-13 at 14.35.21 (2).jpeg', 'Asphalt plant stack and generator'],
};

const WIDTHS = [400, 800, 1200, 1600];
const SRC_DIR = 'resources/images/site';
const OUT_DIR = 'public/images/stock';
const CREDITS = 'resources/images/stock/credits.json';
const inbox = process.argv[2];

await mkdir(SRC_DIR, { recursive: true });
const catalog = JSON.parse(await readFile(CREDITS, 'utf8'));

for (const [key, [file, title]] of Object.entries(PHOTOS)) {
    const src = `${SRC_DIR}/${key}.jpg`;
    if (!existsSync(src)) {
        if (!inbox) throw new Error(`${src} is missing; pass the folder holding "${file}"`);
        await sharp(`${inbox}/${file}`).rotate().jpeg({ quality: 92 }).toFile(src);
    }
    const meta = await sharp(src).metadata();
    // Only the widths the original can fill, so the srcset never offers an upscaled file.
    for (const w of WIDTHS.filter((w) => w <= Math.max(meta.width, 400))) {
        const pipeline = sharp(src).resize({ width: w, withoutEnlargement: true });
        await pipeline.clone().avif({ quality: 56, effort: 4 }).toFile(`${OUT_DIR}/${key}-${w}.avif`);
        await pipeline.clone().webp({ quality: 80 }).toFile(`${OUT_DIR}/${key}-${w}.webp`);
    }
    catalog[key] = { title, own: true, source: 'evolution-engineers', width: meta.width, height: meta.height };
    console.log(`${key}: ${meta.width}x${meta.height}`);
}

await writeFile(CREDITS, JSON.stringify(catalog, null, 2) + '\n');
