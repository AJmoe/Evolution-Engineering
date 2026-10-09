// Downloads the chosen interim photos, records their licences, and builds responsive
// AVIF and WebP versions at 400, 800, 1200 and 1600 px wide.
// Usage: node tools/stock-download.mjs   (after tools/stock-candidates.mjs)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

// Published key -> [candidate slot, index on the contact sheet]
const SELECTION = {
  'road-new': ['roads-paving', 2],
  'road-paving': ['roads-paving', 1],
  'pipeline-trench': ['pipeline-trench', 6],
  'pipeline-forest': ['pipeline-trench', 0],
  'pipe-welding': ['pipeline-trench', 5],
  'water-main': ['pipeline-laying', 0],
  'building-glass': ['building-clinic', 2],
  'building-site': ['building-warehouse', 1],
  'steel-frame': ['building-warehouse', 0],
  'sewer-works': ['sewer-pipes', 0],
  'treatment-plant': ['treatment-plant', 0],
  'water-tower': ['water-tank', 1],
  'cutting-torch': ['workshop', 7],
  'conveyor': ['conveyor', 1],
  'substation': ['electrical', 0],
  'gate-valve': ['valves', 1],
  'check-valve': ['valves', 4],
  'hdpe-pipes': ['pipes-stack', 6],
  'pump-motor': ['motor', 0],
  'excavator': ['excavator', 6],
  'backhoe': ['backhoe', 6],
  'wheel-loader': ['wheel-loader', 2],
  'roller': ['roller', 4],
  'dump-truck': ['dump-truck', 1],
  'skid-steer': ['skid-steer', 4],
  // 2026-10-09: more photos so fewer projects share one
  'asphalt-laying': ['asphalt-overlay', 2],
  'asphalt-crew': ['asphalt-overlay', 3],
  'sewer-jetting': ['sewer-cleaning', 0],
  'manhole-rings': ['manhole', 6],
  'sludge-pond': ['sludge-beds', 3],
  'drying-beds': ['sludge-beds', 4],
  'treatment-aerial': ['wwtp', 1],
  'culvert-pipe': ['storm-drain', 0],
  'concrete-pipe': ['storm-drain', 2],
  'pipe-laying': ['storm-drain', 1],
};

const WIDTHS = [400, 800, 1200, 1600];
const SRC_DIR = 'resources/images/stock';
const OUT_DIR = 'public/images/stock';
const UA = { 'User-Agent': 'EvolutionEngineersSiteBuild/1.0 (website build; interim images)' };

const candidates = JSON.parse(await readFile('storage/stock/candidates.json', 'utf8'));
await mkdir(SRC_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

const credits = {};
for (const [key, [slot, index]] of Object.entries(SELECTION)) {
  const c = candidates[slot]?.[index];
  if (!c) {
    console.log(`MISSING ${key} (${slot} #${index})`);
    continue;
  }
  const src = `${SRC_DIR}/${key}.jpg`;
  if (!existsSync(src)) {
    let res;
    for (let attempt = 1; attempt <= 6; attempt++) {
      res = await fetch(c.url, { headers: UA });
      if (res.status !== 429) break;
      const wait = Number(res.headers.get('retry-after')) * 1000 || 15000 * attempt;
      console.log(`rate limited on ${key}, waiting ${Math.round(wait / 1000)} s`);
      await new Promise((r) => setTimeout(r, wait));
    }
    if (!res.ok) {
      console.log(`DOWNLOAD FAILED ${key}: ${res.status}`);
      continue;
    }
    // Normalise to an sRGB JPEG no wider than 2400 px, with metadata (including location) stripped.
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(src);
    await new Promise((r) => setTimeout(r, 4000));
  }
  const meta = await sharp(src).metadata();
  for (const w of WIDTHS) {
    const pipeline = sharp(src).resize({ width: w, withoutEnlargement: true });
    await pipeline.clone().avif({ quality: 52, effort: 4 }).toFile(`${OUT_DIR}/${key}-${w}.avif`);
    await pipeline.clone().webp({ quality: 74 }).toFile(`${OUT_DIR}/${key}-${w}.webp`);
  }
  // Normalise links that Openverse returns in a dead form (checked 2026-10-09).
  const licenseUrl = (c.license_url || '').replace(/deed\.en\/$/, '');
  const creatorUrl = /panoramio\.com/.test(c.creator_url || '') ? null : c.creator_url;
  credits[key] = {
    title: c.title,
    creator: c.creator,
    creator_url: creatorUrl,
    license: c.license === 'by' ? `CC BY ${c.license_version}` : c.license === 'cc0' ? 'CC0 1.0' : 'Public domain',
    license_url: licenseUrl,
    source: c.source,
    page: c.landing,
    original: c.url,
    width: meta.width,
    height: meta.height,
  };
  console.log(`${key}: ${meta.width}x${meta.height}  ${credits[key].license}`);
}

await writeFile(`${SRC_DIR}/credits.json`, JSON.stringify(credits, null, 2));
const rows = Object.entries(credits).map(
  ([k, c]) => `| ${k} | [${(c.title || 'Untitled').replace(/\|/g, '/')}](${c.page}) | ${c.creator || 'Unknown'} | [${c.license}](${c.license_url}) | ${c.source} |`,
);
// Keep any hand-written sections after the generated table (such as the client logos).
const old = existsSync('IMAGE_CREDITS.md') ? await readFile('IMAGE_CREDITS.md', 'utf8') : '';
const tail = old.includes('\n## ') ? old.slice(old.indexOf('\n## ')) : '';
await writeFile(
  'IMAGE_CREDITS.md',
  `# Interim image credits\n\nThese openly licensed photos stand in until the client's own photography is approved. Every one is marked \`data-placeholder="stock-photo"\` in the HTML. Remove a row when its photo is replaced. CC BY images must keep their credit on the site's credits page.\n\n| Key | Photo | Author | Licence | Source |\n|---|---|---|---|---|\n${rows.join('\n')}\n${tail}`,
);
console.log(`${Object.keys(credits).length} images processed`);
