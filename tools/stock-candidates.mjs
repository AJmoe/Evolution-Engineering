// Finds candidate interim photos on Openverse (openly licensed images) for each image slot,
// and writes contact sheets so a person can choose. Only CC0, public domain and CC BY are accepted.
// Usage: node tools/stock-candidates.mjs   -> storage/stock/candidates.json and sheet-*.png
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

export const SLOTS = {
  'roads-paving': ['asphalt paving', 'road paving', 'asphalt paver', 'road construction'],
  'roads-roller': ['road resurfacing', 'asphalt roller', 'road works'],
  'roads-grader': ['motor grader', 'grader road', 'earthworks'],
  'pipeline-trench': ['pipeline construction', 'pipe trench', 'pipeline'],
  'pipeline-laying': ['water main installation', 'pipe laying', 'water pipe construction'],
  'building-frame': ['concrete building frame construction site', 'building construction', 'construction site building'],
  'building-clinic': ['new hospital building construction', 'hospital construction', 'clinic building'],
  'building-warehouse': ['steel frame building', 'warehouse construction', 'warehouse building'],
  'sewer-pipes': ['sewer construction', 'sewer pipe', 'drainage pipe construction'],
  'treatment-plant': ['wastewater treatment plant tanks', 'sewage treatment plant', 'water treatment plant'],
  'water-tank': ['water tower', 'water tank tower', 'water storage tank'],
  'welding': ['welding', 'welder', 'metal fabrication'],
  'conveyor': ['mine conveyor belt', 'conveyor belt mining', 'conveyor'],
  'electrical': ['electrician', 'electrical panel', 'switchboard electrical'],
  'valves': ['gate valve', 'industrial valves', 'valve pipeline'],
  'pipes-stack': ['pipes stacked', 'plastic pipes', 'steel pipes'],
  'motor': ['industrial electric motor', 'electric motor', 'pump motor'],
  'workshop': ['steel fabrication workshop', 'fabrication workshop', 'metal workshop'],
  'excavator': ['excavator digging', 'excavator'],
  'backhoe': ['backhoe loader', 'backhoe'],
  'wheel-loader': ['wheel loader construction', 'wheel loader', 'front loader'],
  'roller': ['road roller compactor', 'road roller', 'compactor'],
  'dump-truck': ['dump truck construction site', 'dump truck', 'tipper truck'],
  'pickup': ['toyota hilux', 'pickup truck', 'land cruiser'],
  'skid-steer': ['skid steer loader', 'skid steer'],
};

const API = 'https://api.openverse.org/v1/images/';
const PER_SLOT = 8;
// Vehicle models are rarer in open collections; allow smaller originals with MIN_WIDTH=1200.
const MIN_WIDTH = Number(process.env.MIN_WIDTH) || 1600;

async function search(queries) {
  const pool = new Map();
  for (const q of queries) {
    for (const r of await searchOne(q)) if (!pool.has(r.id)) pool.set(r.id, r);
    if (pool.size >= PER_SLOT) break;
    await new Promise((r) => setTimeout(r, 900));
  }
  return [...pool.values()].slice(0, PER_SLOT);
}

async function searchOne(q) {
  const url = `${API}?q=${encodeURIComponent(q)}&license=cc0,pdm,by&aspect_ratio=wide&mature=false&page_size=20`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'EvolutionEngineersSiteBuild/1.0' } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} for ${q}`);
    const data = await res.json();
    return data.results
      .filter((r) => (r.width || 0) >= MIN_WIDTH && r.width > r.height * 1.2 && ['cc0', 'pdm', 'by'].includes(r.license))
      .slice(0, PER_SLOT)
      .map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        thumb: r.thumbnail,
        width: r.width,
        height: r.height,
        license: r.license,
        license_version: r.license_version,
        license_url: r.license_url,
        creator: r.creator,
        creator_url: r.creator_url,
        source: r.source,
        landing: r.foreign_landing_url,
        attribution: r.attribution,
      }));
  }
  throw new Error(`rate limited for ${q}`);
}

/** Wikimedia files have a resizing service; use it for small previews. */
export function thumbFor(c, width = 330) {
  const m = c.url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w)\/(\w\w)\/(.+)$/);
  if (m) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/${width}px-${m[3]}`;
  return c.thumb;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  await mkdir('storage/stock', { recursive: true });
  let all = {};
  if (process.argv.includes('--sheets')) {
    all = JSON.parse(await readFile('storage/stock/candidates.json', 'utf8'));
  } else if (process.argv.includes('--extra')) {
    // Extra searches merged into the saved candidates: --extra key=query|query ...
    all = JSON.parse(await readFile('storage/stock/candidates.json', 'utf8'));
    for (const arg of process.argv.slice(process.argv.indexOf('--extra') + 1)) {
      const [key, qs] = arg.split('=');
      all[key] = await search(qs.split('|'));
      console.log(`${key}: ${all[key].length} candidates`);
    }
    await writeFile('storage/stock/candidates.json', JSON.stringify(all, null, 2));
  } else {
    for (const [key, q] of Object.entries(SLOTS)) {
      all[key] = await search(q);
      console.log(`${key}: ${all[key].length} candidates`);
      await new Promise((r) => setTimeout(r, 1200));
    }
    await writeFile('storage/stock/candidates.json', JSON.stringify(all, null, 2));
  }

  // Download thumbnails locally (Wikimedia requires a user agent), then build contact sheets.
  await mkdir('storage/stock/thumbs', { recursive: true });
  const { pathToFileURL } = await import('node:url');
  const { existsSync } = await import('node:fs');
  for (const [key, list] of Object.entries(all)) {
    for (const [i, c] of list.entries()) {
      const file = `storage/stock/thumbs/${key}-${i}.jpg`;
      c.localThumb = pathToFileURL(file).href;
      if (existsSync(file)) continue;
      try {
        const res = await fetch(thumbFor(c), { headers: { 'User-Agent': 'EvolutionEngineersSiteBuild/1.0 (website build; contact via repo owner)' } });
        if (res.ok) await writeFile(file, Buffer.from(await res.arrayBuffer()));
        else console.log(`thumb ${res.status}: ${key}-${i}`);
      } catch (e) {
        console.log(`thumb failed: ${key}-${i} ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  // Contact sheets: five slots per sheet, eight thumbnails per row.
  const keys = Object.keys(all);
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
  for (let s = 0; s * 5 < keys.length; s++) {
    const rows = keys.slice(s * 5, s * 5 + 5).map((k) =>
      `<h2>${k}</h2><div class="row">${all[k]
        .map((c, i) => `<figure><img src="${c.localThumb}"><figcaption>${i} · ${c.license} · ${c.source}</figcaption></figure>`)
        .join('')}</div>`,
    );
    const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });
    const html = `${process.cwd()}/storage/stock/sheet-${s}.html`;
    await writeFile(html, `<meta charset=utf-8>` + (
      `<style>body{font:13px sans-serif;margin:12px}h2{margin:10px 0 4px;font-size:15px}.row{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
       figure{margin:0}img{width:100%;height:120px;object-fit:cover;background:#ddd}figcaption{font-size:11px}</style>${rows.join('')}`));
    await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `storage/stock/sheet-${s}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log('contact sheets written');
}
