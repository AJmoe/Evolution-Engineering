// Shared Three.js helpers: renderer setup, a sky environment for reflections,
// canvas textures and easing. Imported only by the 3D modules.
import {
  BackSide,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
  Float32BufferAttribute,
} from 'three';

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** 0..1 position of p between a and b, clamped. */
export const range = (p, a, b) => clamp01((p - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;

export function createRenderer(canvas, { pixelRatio, shadows, alpha = true, preserve = false }) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: preserve,
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/**
 * Builds a small sky-gradient scene and prefilters it with PMREM,
 * so glass reflects a daylight sky rather than black.
 */
export function skyEnvironment(renderer, { top = '#8EC2E8', horizon = '#F4F8FB', ground = '#D9D6CF', sun = true } = {}) {
  const scene = new Scene();
  const geo = new SphereGeometry(50, 48, 24);
  const pos = geo.attributes.position;
  const colors = [];
  const cTop = new Color(top);
  const cHor = new Color(horizon);
  const cGround = new Color(ground);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    if (y >= 0) c.copy(cHor).lerp(cTop, Math.pow(y, 0.6));
    else c.copy(cHor).lerp(cGround, Math.min(1, -y * 4));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  scene.add(new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));
  if (sun) {
    const s = new Mesh(new SphereGeometry(4, 16, 8), new MeshBasicMaterial({ color: new Color(6, 5.6, 5) }));
    s.position.set(-28, 30, 22);
    scene.add(s);
  }
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  geo.dispose();
  return env;
}

/**
 * A sky dome coloured by elevation. Its horizon colour equals the fog colour,
 * so distant ground melts into the sky without a visible edge.
 */
export function skyDome(radius, { top, mid, horizon }) {
  const geo = new SphereGeometry(radius, 32, 24);
  const pos = geo.attributes.position;
  const colors = [];
  const cTop = new Color(top);
  const cMid = new Color(mid);
  const cHor = new Color(horizon);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const y = Math.max(0, pos.getY(i) / radius);
    if (y < 0.18) c.copy(cHor).lerp(cMid, y / 0.18);
    else c.copy(cMid).lerp(cTop, Math.min(1, (y - 0.18) / 0.6));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const dome = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  return dome;
}

export function canvasTexture(width, height, draw, { srgb = true, repeat = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new CanvasTexture(canvas);
  if (srgb) tex.colorSpace = SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Curtain-wall textures: one tile is 4 bays by 4 floors.
 * Returns a colour map and a roughness map that share layout.
 */
export function facadeTextures() {
  const W = 512;
  const H = 512;
  const bays = 4;
  const floors = 4;
  const bw = W / bays;
  const fh = H / floors;
  const spandrel = fh * 0.24;
  const mullion = 4;

  const color = canvasTexture(W, H, (ctx) => {
    for (let f = 0; f < floors; f++) {
      const y = f * fh;
      for (let b = 0; b < bays; b++) {
        const x = b * bw;
        const g = ctx.createLinearGradient(x, y, x + bw, y + fh);
        const tint = (b + f) % 3;
        g.addColorStop(0, ['#6FA7CF', '#78AFD6', '#6A9FC7'][tint]);
        g.addColorStop(1, ['#3F7FAE', '#4787B5', '#3B78A6'][tint]);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, bw, fh);
      }
      ctx.fillStyle = '#E7ECF1';
      ctx.fillRect(0, y + fh - spandrel, W, spandrel);
      ctx.fillStyle = 'rgba(11,42,74,0.10)';
      ctx.fillRect(0, y + fh - spandrel, W, 2);
    }
    ctx.fillStyle = '#C9D4DE';
    for (let b = 0; b <= bays; b++) ctx.fillRect(b * bw - mullion / 2, 0, mullion, H);
  });

  const rough = canvasTexture(
    W,
    H,
    (ctx) => {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#B0B0B0';
      for (let f = 0; f < floors; f++) ctx.fillRect(0, f * fh + fh - spandrel, W, spandrel);
      for (let b = 0; b <= bays; b++) ctx.fillRect(b * bw - mullion / 2, 0, mullion, H);
    },
    { srgb: false },
  );

  const metal = canvasTexture(
    W,
    H,
    (ctx) => {
      ctx.fillStyle = '#5A5A5A';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#000000';
      for (let f = 0; f < floors; f++) ctx.fillRect(0, f * fh + fh - spandrel, W, spandrel);
    },
    { srgb: false },
  );

  return { color, rough, metal, tileBays: bays, tileFloors: floors };
}

/** Soft radial shadow used as a contact shadow under buildings and homes. */
export function contactShadowTexture() {
  return canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(11,42,74,0.55)');
      g.addColorStop(0.5, 'rgba(11,42,74,0.22)');
      g.addColorStop(1, 'rgba(11,42,74,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    { repeat: false },
  );
}

/** Disposes every geometry, material and texture under an object. */
export function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of mats) {
      for (const key of Object.keys(m)) {
        const v = m[key];
        if (v && v.isTexture) v.dispose();
      }
      m.dispose();
    }
  });
}
