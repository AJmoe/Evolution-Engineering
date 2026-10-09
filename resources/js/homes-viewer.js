// Small-homes 3D viewer. One small scene per canvas: drag or arrow keys to turn,
// slow auto-rotate, day and evening moods, and rendering only when visible and changed.
// Models are built from the same spec as the floor plans (home-designs.js), with procedural
// textures for plaster, face brick, roof tiles, iron sheeting, paving, sand and lawn.
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Shape,
  Vector3,
} from 'three';
import {
  canvasTexture,
  contactShadowTexture,
  createRenderer,
  disposeTree,
  skyDome,
  skyEnvironment,
} from './three-common.js';
import { DESIGNS, PLINTH, WALL_H } from './home-designs.js';

const PAUSE_MS = 3500;
const AUTO_SPEED = 0.16; // radians per second

const MOODS = {
  day: {
    sky: { top: '#7FB6E6', mid: '#BFDBF2', horizon: '#F1EBDD' },
    hemi: 1.05,
    sun: 2.6,
    sunColor: 0xfff0d6,
    env: 0.85,
    glow: 0,
    lamp: 0,
    exposure: 1.0,
    fog: 0xf1ebdd,
  },
  evening: {
    sky: { top: '#16304F', mid: '#4C6A90', horizon: '#D9A27E' },
    hemi: 0.3,
    sun: 0.5,
    sunColor: 0xffa865,
    env: 0.3,
    glow: 1.8,
    lamp: 6,
    exposure: 1.05,
    fog: 0xc99a7e,
  },
};

/* ---------- Procedural textures ---------- */

const rand = (seed) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
function speckle(ctx, w, h, base, spread, count, size, seed) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const r = rand(seed);
  for (let i = 0; i < count; i++) {
    const v = (r() - 0.5) * spread;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(r() * w, r() * h, size * (0.5 + r()), size * (0.5 + r()));
  }
}

function textures() {
  // Each texture tile covers `tile` metres; box UVs are scaled to metres (see box()).
  return {
    plaster: canvasTexture(256, 256, (c, w, h) => speckle(c, w, h, '#efe8dc', 0.07, 5000, 2, 7)),
    brick: canvasTexture(256, 128, (c, w, h) => {
      c.fillStyle = '#d8d2c8';
      c.fillRect(0, 0, w, h);
      const r = rand(11);
      for (let row = 0; row < 8; row++) {
        for (let col = -1; col < 5; col++) {
          const x = col * 56 + (row % 2 ? 28 : 0) + 2;
          const t = 0.85 + r() * 0.3;
          c.fillStyle = `rgb(${Math.round(150 * t)},${Math.round(78 * t)},${Math.round(52 * t)})`;
          c.fillRect(x, row * 16 + 2, 52, 13);
        }
      }
    }),
    tiles: canvasTexture(256, 256, (c, w) => {
      const r = rand(5);
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const t = 0.85 + r() * 0.25;
          const g = c.createLinearGradient(0, row * 32, 0, row * 32 + 32);
          g.addColorStop(0, `rgb(${Math.round(70 * t)},${Math.round(74 * t)},${Math.round(80 * t)})`);
          g.addColorStop(1, `rgb(${Math.round(40 * t)},${Math.round(43 * t)},${Math.round(48 * t)})`);
          c.fillStyle = g;
          c.fillRect(col * 32 + (row % 2 ? 16 : 0), row * 32, 32, 32);
          c.fillRect(col * 32 + (row % 2 ? 16 : 0) - 256, row * 32, 32, 32);
        }
      }
      c.fillStyle = 'rgba(0,0,0,.35)';
      for (let row = 0; row < 8; row++) c.fillRect(0, row * 32 + 30, w, 2);
    }),
    sheeting: canvasTexture(128, 128, (c, w, h) => {
      for (let x = 0; x < w; x++) {
        const v = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * 8);
        const l = Math.round(150 + v * 60);
        c.fillStyle = `rgb(${l - 10},${l - 4},${l})`;
        c.fillRect(x, 0, 1, h);
      }
    }),
    paving: canvasTexture(256, 256, (c, w, h) => {
      speckle(c, w, h, '#b9b4ab', 0.08, 2500, 2, 3);
      c.strokeStyle = 'rgba(70,64,56,.45)';
      c.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        c.beginPath();
        c.moveTo(0, i * 32);
        c.lineTo(w, i * 32);
        c.stroke();
        for (let j = 0; j < 4; j++) {
          const x = j * 64 + (i % 2 ? 32 : 0);
          c.beginPath();
          c.moveTo(x, i * 32);
          c.lineTo(x, i * 32 + 32);
          c.stroke();
        }
      }
    }),
    sand: canvasTexture(256, 256, (c, w, h) => speckle(c, w, h, '#d9c6a0', 0.12, 9000, 2, 17)),
    lawn: canvasTexture(256, 256, (c, w, h) => {
      speckle(c, w, h, '#86a957', 0.16, 12000, 2, 23);
    }),
    wood: canvasTexture(128, 256, (c, w, h) => {
      c.fillStyle = '#8a5f3c';
      c.fillRect(0, 0, w, h);
      const r = rand(31);
      for (let i = 0; i < 40; i++) {
        c.strokeStyle = `rgba(40,20,8,${0.08 + r() * 0.12})`;
        c.beginPath();
        const x = r() * w;
        c.moveTo(x, 0);
        c.bezierCurveTo(x + 6, h / 3, x - 6, (2 * h) / 3, x + 3, h);
        c.stroke();
      }
    }),
  };
}

function materials() {
  const T = textures();
  const std = (opts) => new MeshStandardMaterial(opts);
  return {
    wall: std({ map: T.plaster, roughness: 0.95 }),
    trim: std({ color: 0xf7f7f4, roughness: 0.7 }),
    brick: std({ map: T.brick, roughness: 0.9 }),
    tiles: std({ map: T.tiles, roughness: 0.75, metalness: 0.05 }),
    sheet: std({ map: T.sheeting, roughness: 0.4, metalness: 0.6 }),
    slab: std({ color: 0xcfd2d4, roughness: 0.9 }),
    glass: std({
      color: 0x40607c,
      roughness: 0.05,
      metalness: 0.9,
      emissive: new Color(0xffc583),
      emissiveIntensity: 0,
    }),
    frame: std({ color: 0x2b2f35, roughness: 0.5, metalness: 0.4 }),
    door: std({ map: T.wood, roughness: 0.6 }),
    timber: std({ map: T.wood, roughness: 0.75 }),
    steel: std({ color: 0x3a3f46, roughness: 0.45, metalness: 0.5 }),
    gutter: std({ color: 0x9aa1a8, roughness: 0.4, metalness: 0.5 }),
    paving: std({ map: T.paving, roughness: 0.95 }),
    sand: std({ map: T.sand, roughness: 1 }),
    lawn: std({ map: T.lawn, roughness: 1 }),
    tank: std({ color: 0x2f6b3a, roughness: 0.55 }),
    bark: std({ color: 0x5a4632, roughness: 1 }),
    leaf: std({ color: 0x5f7f35, roughness: 0.9, flatShading: true }),
    leafDark: std({ color: 0x45612a, roughness: 0.9, flatShading: true }),
    boundary: std({ map: T.plaster, color: 0xe6dccb, roughness: 0.95 }),
  };
}

/* ---------- Geometry helpers ---------- */

/** A box whose UVs are in metres divided by `tile`, so textures keep their real scale on every face. */
function box(w, h, d, mat, x, y, z, tile = 1.5) {
  const geo = new BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // Face order: +x, -x, +y, -y, +z, -z; four vertices each.
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let face = 0; face < 6; face++) {
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[face][0]) / tile, (uv.getY(i) * dims[face][1]) / tile);
    }
  }
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A flat panel (thin box) rotated about x or z, for roof planes. */
function panel(w, d, mat, tile) {
  return box(w, 0.06, d, mat, 0, 0, 0, tile);
}

/** Gable roof over a wing. Ridge along x ('gable-x') or z ('gable-y'), with fascia, gutters and gable ends. */
function gableRoof(wing, rise, M, cx, cz) {
  const g = new Group();
  const over = 0.45;
  const alongX = wing.roof === 'gable-x';
  const len = (alongX ? wing.w : wing.d) + over * 2;
  const span = alongX ? wing.d : wing.w;
  const half = span / 2 + over;
  const slope = Math.hypot(half, rise);
  const angle = Math.atan2(rise, half);
  const top = PLINTH + WALL_H;
  const midX = wing.x + wing.w / 2 - cx;
  const midZ = wing.y + wing.d / 2 - cz;
  for (const sgn of [-1, 1]) {
    const p = panel(alongX ? len : slope, alongX ? slope : len, M.tiles, 1.2);
    if (alongX) {
      p.rotation.x = sgn * angle;
      p.position.set(midX, top + rise / 2 + 0.05, midZ + (sgn * half) / 2);
    } else {
      p.rotation.z = -sgn * angle;
      p.position.set(midX + (sgn * half) / 2, top + rise / 2 + 0.05, midZ);
    }
    g.add(p);
    // fascia and gutter along the eave
    const eaveOff = sgn * (half - 0.02);
    const fascia = alongX
      ? box(len, 0.22, 0.04, M.trim, midX, top - 0.05, midZ + eaveOff)
      : box(0.04, 0.22, len, M.trim, midX + eaveOff, top - 0.05, midZ);
    g.add(fascia);
    const gutter = new Mesh(new CylinderGeometry(0.07, 0.07, len, 10), M.gutter);
    if (alongX) gutter.rotation.z = Math.PI / 2;
    else gutter.rotation.x = Math.PI / 2;
    gutter.position.set(
      alongX ? midX : midX + eaveOff + sgn * 0.08,
      top - 0.12,
      alongX ? midZ + eaveOff + sgn * 0.08 : midZ,
    );
    g.add(gutter);
  }
  // ridge capping
  g.add(
    alongX
      ? box(len, 0.1, 0.25, M.tiles, midX, top + rise + 0.06, midZ)
      : box(0.25, 0.1, len, M.tiles, midX, top + rise + 0.06, midZ),
  );
  // plastered gable ends
  const s = new Shape();
  s.moveTo(-span / 2, 0);
  s.lineTo(span / 2, 0);
  s.lineTo(0, rise);
  s.closePath();
  for (const sgn of [-1, 1]) {
    const geo = new ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    const end = new Mesh(geo, M.wall);
    end.castShadow = true;
    if (alongX) {
      end.rotation.y = Math.PI / 2;
      end.position.set(midX + sgn * (wing.w / 2) - (sgn > 0 ? 0.2 : 0), top, midZ);
    } else {
      end.position.set(midX, top, midZ + sgn * (wing.d / 2) - (sgn > 0 ? 0.2 : 0));
    }
    g.add(end);
  }
  return g;
}

/** Window or door unit facing `out`, centred on the wall line. */
function opening(o, M, cx, cz) {
  const g = new Group();
  const horiz = o.y1 === o.y2;
  const len = horiz ? Math.abs(o.x2 - o.x1) : Math.abs(o.y2 - o.y1);
  const mx = (o.x1 + o.x2) / 2 - cx;
  const mz = (o.y1 + o.y2) / 2 - cz;
  const face = { s: [0, 0], n: [0, Math.PI], e: [0, Math.PI / 2], w: [0, -Math.PI / 2] }[o.out][1];
  const isDoor = o.type === 'door' || o.type === 'slider';
  const h = isDoor ? 2.1 : (o.h ?? 1.2);
  const sill = isDoor ? 0 : (o.sill ?? 0.95);
  const y0 = PLINTH + sill;
  const t = 0.06;
  // reveal (dark recess), frame, glazing or door leaf
  g.add(box(len, h, 0.04, M.frame, 0, y0 + h / 2, 0.01));
  if (o.type === 'door') {
    g.add(box(len - 0.12, h - 0.08, 0.06, M.door, 0, y0 + h / 2 - 0.02, 0.05));
    g.add(box(0.03, 0.18, 0.05, M.steel, len / 2 - 0.16, y0 + 1.0, 0.1));
  } else {
    const glass = box(len - 0.08, h - 0.08, 0.02, M.glass, 0, y0 + h / 2, 0.03);
    glass.castShadow = false;
    g.add(glass);
    const bars = o.type === 'slider' ? Math.max(2, Math.round(len / 1.2)) : len > 1.3 ? 2 : 1;
    for (let i = 1; i < bars; i++) g.add(box(0.05, h, t, M.frame, -len / 2 + (i * len) / bars, y0 + h / 2, 0.05));
    if (o.type !== 'slider') g.add(box(len, 0.05, t, M.frame, 0, y0 + h * 0.62, 0.05));
    for (const sx of [-1, 1]) g.add(box(0.05, h, t, M.frame, (sx * (len - 0.05)) / 2, y0 + h / 2, 0.05));
    g.add(box(len, 0.05, t, M.frame, 0, y0 + h - 0.025, 0.05));
    if (o.type !== 'slider') g.add(box(len + 0.12, 0.05, 0.16, M.slab, 0, y0 - 0.03, 0.08));
  }
  if (!isDoor || o.type === 'door') g.add(box(len + 0.1, 0.12, 0.08, M.trim, 0, y0 + h + 0.06, 0.04));
  g.position.set(mx, 0, mz);
  g.rotation.y = face;
  // Walls are the wing rectangles, so the plan line is the wall face; units sit just proud of it.
  return g;
}

function tree(M, x, z, scale = 1, seed = 1) {
  const r = rand(seed * 977);
  const g = new Group();
  const trunk = new Mesh(new CylinderGeometry(0.1 * scale, 0.16 * scale, 2.2 * scale, 7), M.bark);
  trunk.position.y = 1.1 * scale;
  trunk.rotation.z = (r() - 0.5) * 0.2;
  trunk.castShadow = true;
  g.add(trunk);
  // Flat-topped acacia canopy made of a few squashed blobs
  for (let i = 0; i < 4; i++) {
    const blob = new Mesh(new IcosahedronGeometry(1.1 * scale, 0), i % 2 ? M.leaf : M.leafDark);
    blob.scale.set(1.4 + r() * 0.5, 0.45, 1.2 + r() * 0.5);
    blob.position.set((r() - 0.5) * 1.6 * scale, 2.3 * scale + r() * 0.3 * scale, (r() - 0.5) * 1.6 * scale);
    blob.castShadow = true;
    g.add(blob);
  }
  g.position.set(x, 0, z);
  return g;
}

function shrub(M, x, z, s = 0.5) {
  const m = new Mesh(new DodecahedronGeometry(s, 0), M.leaf);
  m.scale.y = 0.75;
  m.position.set(x, s * 0.6, z);
  m.castShadow = true;
  return m;
}

/** Builds a home and its plot from a design spec. Plan (x, y) maps to world (x - W/2, z = y - D/2). */
function buildHome(d, M) {
  const g = new Group();
  const [W, D] = d.size;
  const cx = W / 2;
  const cz = D / 2;
  const top = PLINTH + WALL_H;

  for (const w of d.wings) {
    const x = w.x + w.w / 2 - cx;
    const z = w.y + w.d / 2 - cz;
    g.add(box(w.w + 0.12, PLINTH, w.d + 0.12, M.brick, x, PLINTH / 2, z, 1.2));
    g.add(box(w.w, WALL_H, w.d, M.wall, x, PLINTH + WALL_H / 2, z));
    if (w.roof === 'flat') {
      g.add(box(w.w + 0.06, 0.5, w.d + 0.06, M.wall, x, top + 0.25, z));
      g.add(box(w.w + 0.16, 0.08, w.d + 0.16, M.trim, x, top + 0.54, z));
      g.add(box(w.w - 0.3, 0.06, w.d - 0.3, M.slab, x, top + 0.4, z));
    } else {
      g.add(gableRoof(w, d.roofRise, M, cx, cz));
    }
  }
  for (const o of d.openings) g.add(opening(o, M, cx, cz));

  if (d.veranda) {
    const [vx, vy, vw, vd] = d.veranda.rect;
    const x = vx + vw / 2 - cx;
    const z = vy + vd / 2 - cz;
    g.add(box(vw, 0.2, vd, M.paving, x, 0.1, z, 2));
    const roof = box(vw + 0.5, 0.06, vd + 0.35, M.sheet, x, top - 0.18, z + 0.1, 0.9);
    roof.rotation.x = 0.07;
    g.add(roof);
    g.add(box(vw + 0.5, 0.18, 0.04, M.trim, x, top - 0.33, vy + vd - cz + 0.27));
    for (const px of d.veranda.posts)
      g.add(box(0.12, top - 0.4, 0.12, M.steel, px - cx, 0.2 + (top - 0.4) / 2, vy + vd - cz - 0.1));
  }
  if (d.pergola) {
    const [gx, gy, gw, gd] = d.pergola.rect;
    for (let i = 0; i <= 8; i++)
      g.add(box(0.08, 0.2, gd + 0.4, M.timber, gx - cx + 0.15 + (i * (gw - 0.3)) / 8, top - 0.05, gy + gd / 2 - cz, 1));
    g.add(box(gw, 0.22, 0.14, M.timber, gx + gw / 2 - cx, top - 0.25, gy + gd - cz));
    for (const px of [gx + 0.12, gx + gw - 0.12])
      g.add(box(0.14, top - 0.3, 0.14, M.timber, px - cx, (top - 0.3) / 2, gy + gd - cz));
  }
  if (d.carport) {
    const [px, py, pw, pd] = d.carport.rect;
    g.add(box(pw + 0.3, 0.08, pd + 0.3, M.sheet, px + pw / 2 - cx, 2.6, py + pd / 2 - cz, 0.9));
    for (const ax of [px + 0.08, px + pw - 0.08])
      for (const az of [py + 0.1, py + pd - 0.1]) g.add(box(0.1, 2.6, 0.1, M.steel, ax - cx, 1.3, az - cz));
  }
  if (d.tank) {
    const tank = new Mesh(new CylinderGeometry(d.tank.r, d.tank.r, 2.0, 28), M.tank);
    tank.position.set(d.tank.x - cx, 1.25, d.tank.y - cz);
    tank.castShadow = true;
    g.add(tank);
    g.add(box(d.tank.r * 2.1, 0.25, d.tank.r * 2.1, M.slab, d.tank.x - cx, 0.12, d.tank.y - cz));
    const lid = new Mesh(new CylinderGeometry(d.tank.r * 0.3, d.tank.r * 0.3, 0.12, 16), M.tank);
    lid.position.set(d.tank.x - cx, 2.3, d.tank.y - cz);
    g.add(lid);
  }

  /* Plot: lawn and paving around the house, driveway, low boundary wall with a gate gap, trees */
  const ext = Math.max(W + (d.carport ? 4 : 0) + (d.tank ? 2 : 0), D + (d.veranda ? 2.2 : 0));
  const plotW = ext + 9;
  const plotD = ext + 9;
  const shiftX = d.carport ? 1.6 : d.tank ? 0.8 : 0;
  const lawn = new Mesh(new PlaneGeometry(plotW, plotD), M.lawn);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(shiftX, 0.015, 0.5);
  lawn.receiveShadow = true;
  lawn.material.map.repeat.set(plotW / 4, plotD / 4);
  g.add(lawn);
  // driveway from the gate to the front of the house (or the carport)
  const driveX = d.carport ? d.carport.rect[0] + d.carport.rect[2] / 2 - cx : 0;
  const driveFrom = d.carport
    ? d.carport.rect[1] + d.carport.rect[3] - cz
    : (d.veranda ? d.veranda.rect[1] + d.veranda.rect[3] : D) - cz;
  const driveTo = plotD / 2 + 0.5;
  g.add(box(d.carport ? 3.2 : 1.6, 0.04, driveTo - driveFrom, M.paving, driveX, 0.03, (driveFrom + driveTo) / 2, 2));
  // boundary wall: three sides plus the front with a gap for the gate
  const wallH = 1.2;
  const bx = shiftX;
  const bz = 0.5;
  const sides = [
    [bx, bz - plotD / 2, plotW, 0.2],
    [bx - plotW / 2, bz, 0.2, plotD],
    [bx + plotW / 2, bz, 0.2, plotD],
  ];
  for (const [x, z, w, dd] of sides) g.add(box(w, wallH, dd, M.boundary, x, wallH / 2, z));
  const gap = (d.carport ? 4 : 2.6) / 2;
  const frontZ = bz + plotD / 2;
  const leftLen = driveX - gap - (bx - plotW / 2);
  const rightLen = bx + plotW / 2 - (driveX + gap);
  g.add(box(leftLen, wallH, 0.2, M.boundary, bx - plotW / 2 + leftLen / 2, wallH / 2, frontZ));
  g.add(box(rightLen, wallH, 0.2, M.boundary, driveX + gap + rightLen / 2, wallH / 2, frontZ));
  for (const px of [driveX - gap, driveX + gap])
    g.add(box(0.4, wallH + 0.3, 0.4, M.boundary, px, (wallH + 0.3) / 2, frontZ));
  // planting
  g.add(tree(M, bx - plotW / 2 + 2.2, bz - plotD / 2 + 2.4, 1.15, 1));
  g.add(tree(M, bx + plotW / 2 - 2.0, bz + plotD / 2 - 2.6, 0.95, 2));
  g.add(tree(M, bx - plotW / 2 + 2.0, bz + plotD / 2 - 2.2, 0.8, 3));
  for (let i = 0; i < 5; i++)
    if (Math.abs(-W / 2 + 0.6 + i * 0.9 - driveX) > 1.3)
      g.add(
        shrub(
          M,
          -W / 2 + 0.6 + i * 0.9,
          (d.veranda ? d.veranda.rect[1] + d.veranda.rect[3] : D) - cz + 0.7,
          0.35 + (i % 2) * 0.12,
        ),
      );
  g.userData.radius = Math.max(plotW, plotD) / 2;
  return g;
}

/* ---------- Viewer ---------- */

export function createHomesViewer(frame, { models, initial, autoRotate = true }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'viewer__canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  frame.appendChild(canvas);

  const mobile = window.matchMedia('(pointer: coarse)').matches;
  const renderer = createRenderer(canvas, {
    pixelRatio: Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2),
    shadows: true,
  });
  const scene = new Scene();
  scene.environment = skyEnvironment(renderer, { sun: false, horizon: '#F1EBDD', ground: '#CDBB98' });
  const skies = { day: skyDome(260, MOODS.day.sky), evening: skyDome(260, MOODS.evening.sky) };
  scene.add(skies.day, skies.evening);

  const camera = new PerspectiveCamera(30, 4 / 3, 1, 400);
  const hemi = new HemisphereLight(0xdcebfa, 0xcdb894, 1);
  const sun = new DirectionalLight(0xfff0d6, 2.6);
  sun.position.set(-16, 24, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 5, far: 80 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  scene.add(hemi, sun);
  const porch = new PointLight(0xffb469, 0, 9, 1.6);
  scene.add(porch);

  const M = materials();
  M.sand.map.repeat.set(60, 60);
  scene.fog = new Fog(0xf1ebdd, 60, 160);
  const ground = new Mesh(new CircleGeometry(200, 64), M.sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const contact = new Mesh(
    new PlaneGeometry(26, 26),
    new MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.45 }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.03;
  scene.add(contact);

  const turntable = new Group();
  scene.add(turntable);
  let model = null;
  let slug = null;
  let mood = 'day';
  let yaw = -0.55;
  let pitch = 0.24;
  let dist = 40;
  let dirty = true;
  let visible = false;
  let raf = 0;
  let last = 0;
  let pausedUntil = 0;
  let dragging = null;

  const setLabel = () => {
    const m = models[slug];
    canvas.setAttribute(
      'aria-label',
      `3D view of ${m?.name ?? 'the design'}, a concept design. Use the left and right arrow keys to turn it.`,
    );
  };

  function show(nextSlug) {
    const def = models[nextSlug];
    if (!def) return;
    if (model) {
      turntable.remove(model);
      model.traverse((o) => o.geometry && o.geometry.dispose());
    }
    const design = DESIGNS[def.params?.type] || DESIGNS.gable;
    model = buildHome(design, M);
    turntable.add(model);
    dist = model.userData.radius * 2.6 + 6;
    const front = design.veranda ? design.veranda.rect[1] + design.veranda.rect[3] : design.size[1];
    porch.position.set(0, PLINTH + WALL_H - 0.4, front - design.size[1] / 2 - 0.4);
    slug = nextSlug;
    setLabel();
    frame.classList.add('is-3d');
    dirty = true;
    kick();
  }

  function setMood(next) {
    mood = MOODS[next] ? next : 'day';
    const m = MOODS[mood];
    skies.day.visible = mood === 'day';
    skies.evening.visible = mood === 'evening';
    scene.fog.color.setHex(m.fog);
    hemi.intensity = m.hemi;
    sun.intensity = m.sun;
    sun.color.setHex(m.sunColor);
    scene.environmentIntensity = m.env;
    M.glass.emissiveIntensity = m.glow;
    porch.intensity = m.lamp;
    renderer.toneMappingExposure = m.exposure;
    dirty = true;
    kick();
  }

  const resize = () => {
    const r = frame.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
    dirty = true;
    kick();
  };

  const placeCamera = () => {
    // Narrow (portrait) frames need the camera further back to fit the plot.
    const d = dist * Math.max(1, 1.25 / camera.aspect);
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * d,
      Math.sin(pitch) * d + 1,
      Math.cos(yaw) * Math.cos(pitch) * d,
    );
    camera.lookAt(new Vector3(0, 1.4, 0));
  };

  const spinning = () => autoRotate && !reduce && !dragging && performance.now() > pausedUntil;

  const frameLoop = (now) => {
    raf = 0;
    if (!visible || document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (spinning()) {
      yaw += AUTO_SPEED * dt;
      dirty = true;
    }
    if (dirty) {
      placeCamera();
      renderer.render(scene, camera);
      dirty = false;
    }
    if (spinning() || dragging) raf = requestAnimationFrame(frameLoop);
    else last = 0;
  };
  function kick() {
    if (!raf && visible) raf = requestAnimationFrame(frameLoop);
  }
  const interact = () => {
    pausedUntil = performance.now() + PAUSE_MS;
    window.setTimeout(kick, PAUSE_MS + 20);
  };

  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY, yaw, pitch };
    canvas.setPointerCapture(e.pointerId);
    kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw = dragging.yaw - (e.clientX - dragging.x) * 0.008;
    pitch = Math.min(0.85, Math.max(0.08, dragging.pitch + (e.clientY - dragging.y) * 0.004));
    dirty = true;
    kick();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = null;
    interact();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    yaw += e.key === 'ArrowRight' ? -0.26 : 0.26;
    dirty = true;
    interact();
    kick();
  });

  const ro = new ResizeObserver(resize);
  ro.observe(frame);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      dirty = true;
      kick();
    }
  });
  io.observe(frame);
  const onVisibility = () => {
    if (!document.hidden) {
      dirty = true;
      kick();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    api.dispose();
  });

  setMood('day');
  show(initial);
  resize();

  const api = {
    show,
    setMood,
    /** Stop turning and face a fixed angle; used when rendering stills. */
    pose(nextYaw, nextPitch) {
      autoRotate = false;
      yaw = nextYaw;
      pitch = nextPitch;
      dirty = true;
      kick();
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      disposeTree(scene);
      renderer.dispose();
      canvas.remove();
      frame.classList.remove('is-3d');
    },
  };
  frame.__viewer = api;
  return api;
}
