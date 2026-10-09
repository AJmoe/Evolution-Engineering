// Draws each concept home's floor plan and blueprint (front and side elevations) as SVG,
// from the same spec the 3D viewer uses (resources/js/home-designs.js).
// Usage: node tools/home-drawings.mjs   -> public/images/homes/<slug>-plan.svg and <slug>-blueprint.svg
import { mkdir, writeFile } from 'node:fs/promises';
import { DESIGNS, PLINTH, WALL_H, grossArea } from '../resources/js/home-designs.js';

const HOMES = {
  gable: { slug: 'the-compact', name: 'The Compact' },
  lshape: { slug: 'the-family-two', name: 'The Family Two' },
  courtyard: { slug: 'the-courtyard', name: 'The Courtyard' },
};
const OUT = 'public/images/homes';
const FONT = "font-family=\"Barlow, 'Segoe UI', Arial, sans-serif\"";
const f = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const m2 = (n) => `${n.toFixed(1).replace(/\.0$/, '')} m²`;

/* ---------- Floor plan ---------- */

function furniture([type, x, y, w, d, rot = 0], S) {
  const X = x * S;
  const Y = y * S;
  const W = w * S;
  const D = d * S;
  const r = (a, b, c, e, extra = '') => `<rect x="${f(a)}" y="${f(b)}" width="${f(c)}" height="${f(e)}" ${extra}/>`;
  switch (type) {
    case 'counter':
      return r(X, Y, W, D, 'class="fx"');
    case 'island':
      return r(X, Y, W, D, 'class="fx"');
    case 'sink':
      return r(X + 4, Y + 4, W / 2 - 6, D - 8, 'rx="4" class="fx"') + r(X + W / 2 + 2, Y + 4, W / 2 - 6, D - 8, 'rx="4" class="fx"');
    case 'stove':
      return [0.3, 0.7].flatMap((a) => [0.3, 0.7].map((b) => `<circle cx="${f(X + W * a)}" cy="${f(Y + D * b)}" r="${f(W * 0.16)}" class="fx"/>`)).join('');
    case 'table4':
    case 'table6': {
      const n = type === 'table6' ? 3 : 2;
      let s = r(X, Y, W, D, 'rx="3" class="fx"');
      for (let i = 0; i < n; i++) {
        const cx = X + (W / n) * (i + 0.5) - 9;
        s += r(cx, Y - 16, 18, 13, 'rx="3" class="fx"') + r(cx, Y + D + 3, 18, 13, 'rx="3" class="fx"');
      }
      return s;
    }
    case 'sofa': {
      if (rot === 90) return r(X, Y, W, D, 'rx="5" class="fx"') + r(X, Y + 6, W * 0.3, D - 12, 'class="fx"');
      return r(X, Y, W, D, 'rx="5" class="fx"') + r(X + 6, Y + D * 0.7, W - 12, D * 0.3, 'class="fx"');
    }
    case 'coffee':
      return r(X, Y, W, D, 'rx="3" class="fx"');
    case 'bed1':
    case 'bed2':
      return r(X, Y, W, D, 'rx="3" class="fx"') + r(X + 5, Y + 5, W - 10, D * 0.17, 'rx="4" class="fx"') + `<path d="M${f(X)} ${f(Y + D * 0.32)}h${f(W)}" class="fx"/>`;
    case 'wardrobe':
      return r(X, Y, W, D, 'class="fx"') + `<path d="M${f(X)} ${f(Y)}L${f(X + W)} ${f(Y + D)}" class="fx thin"/>`;
    case 'shower':
      return r(X, Y, W, D, 'class="fx"') + `<path d="M${f(X)} ${f(Y)}L${f(X + W)} ${f(Y + D)}M${f(X + W)} ${f(Y)}L${f(X)} ${f(Y + D)}" class="fx thin"/>`;
    case 'bath':
      return r(X, Y, W, D, 'rx="3" class="fx"') + r(X + 5, Y + 5, W - 10, D - 10, 'rx="12" class="fx"');
    case 'wc':
      return r(X, Y, W, D * 0.3, 'rx="2" class="fx"') + `<ellipse cx="${f(X + W / 2)}" cy="${f(Y + D * 0.62)}" rx="${f(W / 2)}" ry="${f(D * 0.36)}" class="fx"/>`;
    case 'basin':
      return r(X, Y, W, D, 'rx="3" class="fx"') + `<ellipse cx="${f(X + W / 2)}" cy="${f(Y + D / 2)}" rx="${f(W * 0.32)}" ry="${f(D * 0.3)}" class="fx"/>`;
    case 'tree':
      return `<circle cx="${f(X + W / 2)}" cy="${f(Y + D / 2)}" r="${f(W / 2)}" class="tree"/><circle cx="${f(X + W / 2)}" cy="${f(Y + D / 2)}" r="${f(W / 5)}" class="tree"/>`;
    default:
      return '';
  }
}

const inward = { n: [0, 1], s: [0, -1], e: [-1, 0], w: [1, 0] };
const toward = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

/** A swing door: leaf from the hinge, arc from the latch. dir is the unit vector the door opens towards. */
function swingDoor(x1, y1, x2, y2, dir, S) {
  const len = Math.hypot(x2 - x1, y2 - y1) * S;
  const hx = x1 * S;
  const hy = y1 * S;
  const lx = x2 * S;
  const ly = y2 * S;
  const ex = hx + dir[0] * len;
  const ey = hy + dir[1] * len;
  // sweep direction: sign of the 2D cross product of (latch - hinge) and (leaf end - hinge)
  const cross = (lx - hx) * (ey - hy) - (ly - hy) * (ex - hx);
  return `<path d="M${f(hx)} ${f(hy)}L${f(ex)} ${f(ey)}" class="leaf"/><path d="M${f(lx)} ${f(ly)}A${f(len)} ${f(len)} 0 0 ${cross > 0 ? 1 : 0} ${f(ex)} ${f(ey)}" class="arc"/>`;
}

function opening(o, S, t) {
  const horiz = o.y1 === o.y2;
  const x = Math.min(o.x1, o.x2) * S;
  const y = Math.min(o.y1, o.y2) * S;
  const len = (horiz ? Math.abs(o.x2 - o.x1) : Math.abs(o.y2 - o.y1)) * S;
  const cut = horiz ? `<rect x="${f(x)}" y="${f(y - t / 2 - 1)}" width="${f(len)}" height="${f(t + 2)}" class="cut"/>` : `<rect x="${f(x - t / 2 - 1)}" y="${f(y)}" width="${f(t + 2)}" height="${f(len)}" class="cut"/>`;
  if (o.type === 'door') return cut + swingDoor(o.x1, o.y1, o.x2, o.y2, inward[o.out], S);
  if (o.type === 'slider') {
    const g = horiz
      ? `<rect x="${f(x)}" y="${f(y - 3)}" width="${f(len * 0.55)}" height="3" class="glass"/><rect x="${f(x + len * 0.45)}" y="${f(y)}" width="${f(len * 0.55)}" height="3" class="glass"/>`
      : `<rect x="${f(x - 3)}" y="${f(y)}" width="3" height="${f(len * 0.55)}" class="glass"/><rect x="${f(x)}" y="${f(y + len * 0.45)}" width="3" height="${f(len * 0.55)}" class="glass"/>`;
    return cut + g;
  }
  const g = horiz
    ? `<rect x="${f(x)}" y="${f(y - t / 2)}" width="${f(len)}" height="${f(t)}" class="win"/><path d="M${f(x)} ${f(y)}h${f(len)}" class="pane"/>`
    : `<rect x="${f(x - t / 2)}" y="${f(y)}" width="${f(t)}" height="${f(len)}" class="win"/><path d="M${f(x)} ${f(y)}v${f(len)}" class="pane"/>`;
  return cut + g;
}

function dimLine(x1, y1, x2, y2, label, vertical) {
  const tick = (x, y) => `<path d="M${f(x - 5)} ${f(y + 5)}L${f(x + 5)} ${f(y - 5)}" class="dim"/>`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const text = vertical
    ? `<text x="${f(mx - 7)}" y="${f(my)}" transform="rotate(-90 ${f(mx - 7)} ${f(my)})" class="dimt">${label}</text>`
    : `<text x="${f(mx)}" y="${f(my - 7)}" class="dimt">${label}</text>`;
  return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" class="dim"/>${tick(x1, y1)}${tick(x2, y2)}${text}`;
}

function planSvg(key) {
  const d = DESIGNS[key];
  const home = HOMES[key];
  const S = 50;
  const [W, D] = d.size;
  const extraX = Math.max(d.tank ? d.tank.x + d.tank.r : 0, d.carport ? d.carport.rect[0] + d.carport.rect[2] : 0, W);
  const extraY = Math.max(d.veranda ? d.veranda.rect[1] + d.veranda.rect[3] : 0, D);
  const left = 90;
  const top = 175;
  const width = left + extraX * S + 70;
  const height = top + extraY * S + 120;
  const tExt = 0.23 * S;
  const tInt = 0.115 * S;
  const p = [];
  p.push(`<g transform="translate(${left} ${top})">`);
  // Outdoor areas first
  if (d.veranda) {
    const [vx, vy, vw, vd] = d.veranda.rect.map((v) => v * S);
    p.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vd}" class="deck"/>`);
    for (let i = vx + 12; i < vx + vw; i += 12) p.push(`<path d="M${f(i)} ${vy}v${vd}" class="board"/>`);
    p.push(`<text x="${f(vx + vw / 2)}" y="${f(vy + vd / 2 + 5)}" class="lbl sm">Veranda</text>`);
    for (const px of d.veranda.posts) p.push(`<rect x="${f(px * S - 5)}" y="${f(vy + vd - 10)}" width="10" height="10" class="post"/>`);
  }
  if (d.carport) {
    const [cx, cy, cw, cd] = d.carport.rect.map((v) => v * S);
    p.push(`<rect x="${cx}" y="${cy}" width="${cw}" height="${cd}" class="carport"/><path d="M${cx} ${cy}L${cx + cw} ${cy + cd}M${cx + cw} ${cy}L${cx} ${cy + cd}" class="dash"/>`);
    p.push(`<text x="${f(cx + cw / 2)}" y="${f(cy + cd / 2 - 8)}" class="lbl sm">Carport</text>`);
  }
  for (const room of d.rooms) {
    const [rx, ry, rw, rd] = room.rect.map((v) => v * S);
    const wet = /Bath|suite|Laundry/.test(room.name);
    p.push(`<rect x="${rx}" y="${ry}" width="${rw}" height="${rd}" class="${room.outdoor ? 'paving' : wet ? 'tiles' : 'floor'}"/>`);
  }
  if (d.pergola) {
    const [gx, gy, gw, gd] = d.pergola.rect.map((v) => v * S);
    for (let i = gx + 8; i < gx + gw; i += 16) p.push(`<path d="M${f(i)} ${gy}v${gd}" class="dash"/>`);
    p.push(`<text x="${f(gx + gw / 2)}" y="${f(gy + gd - 10)}" class="lbl sm">Pergola</text>`);
  }
  if (d.tank) p.push(`<circle cx="${d.tank.x * S}" cy="${d.tank.y * S}" r="${d.tank.r * S}" class="fx"/><text x="${d.tank.x * S}" y="${d.tank.y * S + 4}" class="lbl sm">Tank</text>`);
  for (const item of d.furniture) p.push(furniture(item, S));
  // Walls
  p.push(`<polygon points="${d.outline.map(([x, y]) => `${x * S},${y * S}`).join(' ')}" class="wall" stroke-width="${tExt}"/>`);
  for (const [x1, y1, x2, y2] of d.walls) p.push(`<path d="M${x1 * S} ${y1 * S}L${x2 * S} ${y2 * S}" class="wall" stroke-width="${tInt}"/>`);
  for (const o of d.openings) p.push(opening(o, S, tExt));
  for (const dr of d.doors) {
    const horiz = dr.y1 === dr.y2;
    const x = Math.min(dr.x1, dr.x2) * S;
    const y = Math.min(dr.y1, dr.y2) * S;
    const len = (horiz ? Math.abs(dr.x2 - dr.x1) : Math.abs(dr.y2 - dr.y1)) * S;
    p.push(horiz ? `<rect x="${f(x)}" y="${f(y - tInt / 2 - 1)}" width="${f(len)}" height="${f(tInt + 2)}" class="cut"/>` : `<rect x="${f(x - tInt / 2 - 1)}" y="${f(y)}" width="${f(tInt + 2)}" height="${f(len)}" class="cut"/>`);
    p.push(swingDoor(dr.x1, dr.y1, dr.x2, dr.y2, toward[dr.swing], S));
  }
  // Labels
  for (const room of d.rooms) {
    const [ax, ay] = room.at.map((v) => v * S);
    const area = room.rect[2] * room.rect[3];
    p.push(`<text x="${f(ax)}" y="${f(ay)}" class="lbl${room.small ? ' sm' : ''}">${esc(room.name)}</text>`);
    if (!room.small) p.push(`<text x="${f(ax)}" y="${f(ay + 16)}" class="area">${m2(area)}</text>`);
  }
  // Dimensions: overall, and wing breaks along the top
  const breaks = [...new Set(d.wings.flatMap((w) => [w.x, w.x + w.w]))].sort((a, b) => a - b);
  for (let i = 0; i < breaks.length - 1; i++) p.push(dimLine(breaks[i] * S, -34, breaks[i + 1] * S, -34, `${(breaks[i + 1] - breaks[i]).toFixed(1)} m`));
  if (breaks.length > 2) p.push(dimLine(0, -66, W * S, -66, `${W.toFixed(1)} m`));
  p.push(dimLine(-40, 0, -40, D * S, `${D.toFixed(1)} m`, true));
  p.push('</g>');
  // North arrow, scale bar and title
  const by = top + extraY * S + 50;
  p.push(`<g transform="translate(${width - 50} 50)"><circle r="18" class="fx"/><path d="M0 -14L7 10L0 5L-7 10Z" fill="#172b56"/><text y="-24" class="lbl sm">N</text></g>`);
  p.push(`<g transform="translate(${left} ${by})">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${i * S}" y="0" width="${S}" height="6" fill="${i % 2 ? '#fff' : '#172b56'}" stroke="#172b56"/>`).join('')}<text x="0" y="22" class="dimt" text-anchor="start">0</text><text x="${5 * S}" y="22" class="dimt">5 m</text></g>`);
  p.push(`<text x="${left}" y="44" class="title" text-anchor="start">${home.name}: floor plan</text>`);
  p.push(`<text x="${left}" y="68" class="sub" text-anchor="start">${m2(grossArea(d))} under roof · Concept design, indicative only, not for construction</text>`);
  const css = `
    .floor{fill:#fff}.tiles{fill:#eef4fa}.paving{fill:#eef1ec}.deck{fill:#f4ede2;stroke:#c9b79d}.board{stroke:#e2d4bf;stroke-width:1}
    .carport{fill:#f1f2f4;stroke:#9aa5b1;stroke-dasharray:6 5}.dash{stroke:#9aa5b1;stroke-width:1;stroke-dasharray:5 5;fill:none}
    .wall{fill:none;stroke:#1f2a3a;stroke-linejoin:miter;stroke-linecap:square}.cut{fill:#fff}
    .win{fill:#dbe9f6;stroke:#1f2a3a;stroke-width:1}.pane{stroke:#1f2a3a;stroke-width:1}.glass{fill:#dbe9f6;stroke:#1f2a3a;stroke-width:1}
    .leaf{stroke:#1f2a3a;stroke-width:2}.arc{fill:none;stroke:#7b8796;stroke-width:1;stroke-dasharray:3 3}
    .fx{fill:#fff;stroke:#7b8796;stroke-width:1.2}.fx.thin{stroke-width:.8}.tree{fill:#e3efd6;stroke:#7fa35a;stroke-width:1.2}.post{fill:#1f2a3a}
    .lbl{font-size:14px;font-weight:700;fill:#172b56;text-anchor:middle}.lbl.sm{font-size:11px;font-weight:600;fill:#5d6a7a}
    .area{font-size:12px;fill:#5d6a7a;text-anchor:middle}.dim{stroke:#e3262f;stroke-width:1}.dimt{font-size:12px;fill:#c41d25;text-anchor:middle}
    .title{font-size:24px;font-weight:700;fill:#172b56}.sub{font-size:13px;fill:#5d6a7a}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(width)} ${f(height)}" ${FONT}><title>${home.name} floor plan</title><style>${css}</style><rect width="100%" height="100%" fill="#fbfcfe"/>${p.join('')}</svg>`;
}

/* ---------- Blueprint: front and side elevations ---------- */

function elevation(d, side, S, ox, oy) {
  // side 'front': look from +y; horizontal u = x. side 'east': look from +x; horizontal u = maxY - y.
  const [W, D] = d.size;
  const top = PLINTH + WALL_H;
  const rise = d.roofRise;
  const over = 0.45;
  const U = (x, y) => (side === 'front' ? x : D - y);
  const p = [];
  const H = (h) => oy - h * S;
  const X = (u) => ox + u * S;
  // Draw far wings first so near ones cover them.
  const depthKey = (w) => (side === 'front' ? w.y + w.d : w.x + w.w);
  const wings = [...d.wings].sort((a, b) => depthKey(a) - depthKey(b));
  for (const w of wings) {
    const u1 = side === 'front' ? w.x : D - (w.y + w.d);
    const u2 = side === 'front' ? w.x + w.w : D - w.y;
    const ridgeAlongView = (w.roof === 'gable-x' && side === 'front') || (w.roof === 'gable-y' && side === 'east');
    if (w.roof === 'flat') {
      p.push(`<rect x="${f(X(u1 - 0.2))}" y="${f(H(top + 0.35))}" width="${f((u2 - u1 + 0.4) * S)}" height="${f(0.35 * S)}" class="bp fill"/>`);
    } else if (ridgeAlongView) {
      p.push(`<rect x="${f(X(u1 - over))}" y="${f(H(top + rise))}" width="${f((u2 - u1 + 2 * over) * S)}" height="${f(rise * S)}" class="bp fill"/>`);
      for (let h = 0.25; h < rise; h += 0.25) p.push(`<path d="M${f(X(u1 - over))} ${f(H(top + h))}H${f(X(u2 + over))}" class="bp thin"/>`);
    } else {
      p.push(`<polygon points="${f(X(u1 - over))},${f(H(top - 0.1))} ${f(X(u2 + over))},${f(H(top - 0.1))} ${f(X((u1 + u2) / 2))},${f(H(top + rise))}" class="bp fill"/>`);
    }
    p.push(`<rect x="${f(X(u1))}" y="${f(H(top))}" width="${f((u2 - u1) * S)}" height="${f(WALL_H * S)}" class="bp fill"/>`);
    p.push(`<rect x="${f(X(u1 - 0.1))}" y="${f(H(PLINTH))}" width="${f((u2 - u1 + 0.2) * S)}" height="${f(PLINTH * S)}" class="bp fill hatch"/>`);
  }
  const face = side === 'front' ? 's' : 'e';
  for (const o of d.openings.filter((o) => o.out === face)) {
    const u1 = U(Math.min(o.x1, o.x2), Math.max(o.y1, o.y2));
    const u2 = U(Math.max(o.x1, o.x2), Math.min(o.y1, o.y2));
    const a = Math.min(u1, u2);
    const b = Math.max(u1, u2);
    if (o.type === 'door' || o.type === 'slider') {
      const h = 2.1;
      p.push(`<rect x="${f(X(a))}" y="${f(H(PLINTH + h))}" width="${f((b - a) * S)}" height="${f(h * S)}" class="bp fill"/>`);
      p.push(o.type === 'slider' ? `<path d="M${f(X((a + b) / 2))} ${f(H(PLINTH + h))}V${f(H(PLINTH))}" class="bp"/>` : `<rect x="${f(X(a) + 6)}" y="${f(H(PLINTH + h) + 6)}" width="${f((b - a) * S - 12)}" height="${f(h * S * 0.4)}" class="bp thin"/><circle cx="${f(X(b) - 8)}" cy="${f(H(PLINTH + 1.0))}" r="2" class="bp"/>`);
    } else {
      const sill = o.sill ?? 0.95;
      const h = o.h ?? 1.2;
      p.push(`<rect x="${f(X(a))}" y="${f(H(PLINTH + sill + h))}" width="${f((b - a) * S)}" height="${f(h * S)}" class="bp fill"/>`);
      p.push(`<path d="M${f(X((a + b) / 2))} ${f(H(PLINTH + sill + h))}V${f(H(PLINTH + sill))}M${f(X(a))} ${f(H(PLINTH + sill + h * 0.4))}H${f(X(b))}" class="bp thin"/>`);
      p.push(`<rect x="${f(X(a) - 4)}" y="${f(H(PLINTH + sill))}" width="${f((b - a) * S + 8)}" height="4" class="bp"/>`);
    }
  }
  if (side === 'front' && d.veranda) {
    const [vx, , vw] = d.veranda.rect;
    p.push(`<rect x="${f(X(vx - 0.3))}" y="${f(H(top - 0.05))}" width="${f((vw + 0.6) * S)}" height="${f(0.15 * S)}" class="bp fill"/>`);
    for (const px of d.veranda.posts) p.push(`<rect x="${f(X(px) - 3)}" y="${f(H(top - 0.05))}" width="6" height="${f((top - 0.05 - 0.2) * S)}" class="bp fill"/>`);
  }
  if (side === 'front' && d.pergola) {
    const [gx, , gw] = d.pergola.rect;
    p.push(`<rect x="${f(X(gx))}" y="${f(H(top - 0.2))}" width="${f(gw * S)}" height="${f(0.18 * S)}" class="bp fill"/>`);
    for (const px of [gx + 0.1, gx + gw - 0.1]) p.push(`<rect x="${f(X(px) - 3)}" y="${f(H(top - 0.2))}" width="6" height="${f((top - 0.2) * S)}" class="bp fill"/>`);
  }
  if (d.carport) {
    const [cx, cy, cw, cd] = d.carport.rect;
    const a = side === 'front' ? cx : D - (cy + cd);
    const len = side === 'front' ? cw : cd;
    p.push(`<rect x="${f(X(a))}" y="${f(H(2.6))}" width="${f(len * S)}" height="${f(0.18 * S)}" class="bp fill"/>`);
    for (const px of [a + 0.05, a + len - 0.05]) p.push(`<rect x="${f(X(px) - 3)}" y="${f(H(2.6))}" width="6" height="${f(2.6 * S)}" class="bp fill"/>`);
  }
  if (side === 'east' && d.veranda) {
    const [, vy, , vd] = d.veranda.rect;
    const a = D - (vy + vd);
    p.push(`<rect x="${f(X(a - 0.3))}" y="${f(H(top - 0.05))}" width="${f((vd + 0.3) * S)}" height="${f(0.15 * S)}" class="bp fill"/>`);
    p.push(`<rect x="${f(X(a + 0.1) - 3)}" y="${f(H(top - 0.05))}" width="6" height="${f((top - 0.25) * S)}" class="bp fill"/>`);
  }
  if (side === 'east' && d.tank) {
    const u = D - d.tank.y;
    p.push(`<rect x="${f(X(u - d.tank.r))}" y="${f(H(1.9))}" width="${f(2 * d.tank.r * S)}" height="${f(1.9 * S)}" rx="4" class="bp fill"/>`);
    for (let h = 0.3; h < 1.9; h += 0.3) p.push(`<path d="M${f(X(u - d.tank.r))} ${f(H(h))}h${f(2 * d.tank.r * S)}" class="bp thin"/>`);
  }
  // Extent along the view, including carport, tank and veranda
  const us = [0, side === 'front' ? W : D];
  if (d.carport) us.push(side === 'front' ? d.carport.rect[0] + d.carport.rect[2] : D - d.carport.rect[1] + 0);
  if (side === 'east' && d.veranda) us.push(D - (d.veranda.rect[1] + d.veranda.rect[3]));
  const umin = Math.min(...us) - 1;
  const umax = Math.max(...us) + 1;
  p.push(`<path d="M${f(X(umin))} ${f(oy)}H${f(X(umax))}" class="bp ground"/>`);
  for (let u = umin; u < umax; u += 0.3) p.push(`<path d="M${f(X(u))} ${f(oy + 2)}l-8 10" class="bp thin"/>`);
  // Dimensions
  const span = side === 'front' ? W : D;
  p.push(`<path d="M${f(X(0))} ${f(oy + 34)}H${f(X(span))}M${f(X(0))} ${f(oy + 28)}v12M${f(X(span))} ${f(oy + 28)}v12" class="bp thin"/><text x="${f(X(span / 2))}" y="${f(oy + 52)}" class="bpt">${span.toFixed(1)} m</text>`);
  const hTop = top + (rise || 0.35);
  p.push(`<path d="M${f(X(umin) - 10)} ${f(oy)}V${f(H(hTop))}M${f(X(umin) - 16)} ${f(oy)}h12M${f(X(umin) - 16)} ${f(H(hTop))}h12" class="bp thin"/><text x="${f(X(umin) - 18)}" y="${f(H(hTop / 2))}" class="bpt" transform="rotate(-90 ${f(X(umin) - 18)} ${f(H(hTop / 2))})">${hTop.toFixed(2)} m</text>`);
  return { svg: p.join(''), width: (umax - umin) * S };
}

function blueprintSvg(key) {
  const d = DESIGNS[key];
  const home = HOMES[key];
  const S = 34;
  const [W, D] = d.size;
  const frontW = (W + 2 + (d.carport ? d.carport.rect[2] + 0.4 : 0)) * S;
  const sideW = (D + 2 + (d.veranda ? d.veranda.rect[3] : 0)) * S;
  const width = Math.max(1100, 120 + frontW + 140 + sideW + 60);
  const height = 640;
  const baseY = 380;
  const front = elevation(d, 'front', S, 120 + S, baseY);
  const east = elevation(d, 'east', S, 120 + frontW + 140 + S, baseY);
  const css = `
    .bp{fill:none;stroke:#f2f7ff;stroke-width:1.4}.bp.fill{fill:#15508f}.bp.thin{stroke-width:.7;stroke:#cfe0f5}.bp.ground{stroke-width:2.4}
    .bp.hatch{fill:url(#brick)}.bpt{font-size:13px;fill:#e4efff;text-anchor:middle}
    .cap{font-size:15px;font-weight:700;fill:#fff;letter-spacing:.08em}.capsub{font-size:12px;fill:#b9d0ee}
    .tb{fill:none;stroke:#f2f7ff;stroke-width:1}.tbt{font-size:12px;fill:#e4efff}.tbh{font-size:17px;font-weight:700;fill:#fff}`;
  const defs = `<defs><pattern id="grid" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M17 0H0V17" fill="none" stroke="rgba(255,255,255,.07)"/></pattern><pattern id="brick" width="12" height="6" patternUnits="userSpaceOnUse"><rect width="12" height="6" fill="#15508f"/><path d="M0 6h12M6 0v3M0 3h12M12 3v3" stroke="#9fc0e6" stroke-width=".6"/></pattern></defs>`;
  const tbx = width - 380;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(width)} ${height}" ${FONT}><title>${home.name} elevations</title><style>${css}</style>${defs}
<rect width="100%" height="100%" fill="#15508f"/><rect width="100%" height="100%" fill="url(#grid)"/>
<rect x="14" y="14" width="${f(width - 28)}" height="${height - 28}" class="tb"/><rect x="20" y="20" width="${f(width - 40)}" height="${height - 40}" class="tb"/>
${front.svg}${east.svg}
<text x="${120 + S}" y="${baseY + 84}" class="cap">FRONT ELEVATION</text><text x="${120 + S}" y="${baseY + 102}" class="capsub">Scale 1:100 (indicative)</text>
<text x="${f(120 + frontW + 140 + S)}" y="${baseY + 84}" class="cap">SIDE ELEVATION (EAST)</text><text x="${f(120 + frontW + 140 + S)}" y="${baseY + 102}" class="capsub">Scale 1:100 (indicative)</text>
<g><rect x="${f(tbx)}" y="${height - 112}" width="352" height="78" class="tb"/><path d="M${f(tbx)} ${height - 82}h352M${f(tbx + 230)} ${height - 82}v48" class="tb"/>
<text x="${f(tbx + 12)}" y="${height - 91}" class="tbh">EVOLUTION ENGINEERS</text>
<text x="${f(tbx + 12)}" y="${height - 62}" class="tbt">${home.name} · ${m2(grossArea(d))}</text>
<text x="${f(tbx + 12)}" y="${height - 44}" class="tbt">Concept, not for construction</text>
<text x="${f(tbx + 242)}" y="${height - 62}" class="tbt">Sheet A-201</text><text x="${f(tbx + 242)}" y="${height - 44}" class="tbt">Elevations</text></g>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const key of Object.keys(DESIGNS)) {
  const { slug } = HOMES[key];
  await writeFile(`${OUT}/${slug}-plan.svg`, planSvg(key));
  await writeFile(`${OUT}/${slug}-blueprint.svg`, blueprintSvg(key));
  console.log(`${slug}: plan and blueprint, ${grossArea(DESIGNS[key]).toFixed(1)} m²`);
}
