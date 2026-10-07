// Small-homes 3D viewer. One small scene per canvas: drag or arrow keys to turn,
// slow auto-rotate, day and evening moods, and rendering only when visible and changed.
import {
  BoxGeometry,
  CircleGeometry,
  Fog,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Shape,
  Vector3,
} from 'three';
import { contactShadowTexture, createRenderer, disposeTree, skyDome, skyEnvironment } from './three-common.js';

const PAUSE_MS = 3500;
const AUTO_SPEED = 0.18; // radians per second

const MOODS = {
  day: {
    sky: { top: '#93C5EC', mid: '#C8E0F3', horizon: '#EEF4F9' },
    hemi: 1.15,
    sun: 2.3,
    sunColor: 0xfff1dc,
    env: 0.9,
    glow: 0,
    exposure: 1.0,
    fog: 0xeef4f9,
  },
  evening: {
    sky: { top: '#1B3657', mid: '#506F94', horizon: '#C9A58E' },
    hemi: 0.35,
    sun: 0.55,
    sunColor: 0xffb47a,
    env: 0.35,
    glow: 2.2,
    exposure: 1.05,
    fog: 0xc9a58e,
  },
};

/* Materials shared by every home in one viewer */
function materials() {
  return {
    wall: new MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.92 }),
    plinth: new MeshStandardMaterial({ color: 0xc9cfd5, roughness: 0.95 }),
    roof: new MeshStandardMaterial({ color: 0x7f8c9a, roughness: 0.55, metalness: 0.35 }),
    flatRoof: new MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.8 }),
    glass: new MeshStandardMaterial({
      color: 0x5f8fb5,
      roughness: 0.08,
      metalness: 0.6,
      emissive: new Color(0xffc98a),
      emissiveIntensity: 0,
    }),
    frame: new MeshStandardMaterial({ color: 0x0b2a4a, roughness: 0.6 }),
    door: new MeshStandardMaterial({ color: 0xa8825a, roughness: 0.7 }),
    deck: new MeshStandardMaterial({ color: 0xc8b49a, roughness: 0.9 }),
    post: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    paving: new MeshStandardMaterial({ color: 0xe1e5e8, roughness: 0.95 }),
    tank: new MeshStandardMaterial({ color: 0xd3dfea, roughness: 0.5 }),
    lawn: new MeshStandardMaterial({ color: 0xbfdc9f, roughness: 1 }),
    plant: new MeshStandardMaterial({ color: 0x7fb24a, roughness: 0.9, flatShading: true }),
  };
}

const box = (w, h, d, mat, x, y, z) => {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/** A gable roof as an extruded triangle running along z. */
function gableRoof(width, depth, rise, overhang, mat) {
  const s = new Shape();
  const hw = width / 2 + overhang;
  s.moveTo(-hw, 0);
  s.lineTo(hw, 0);
  s.lineTo(0, rise);
  s.closePath();
  const geo = new ExtrudeGeometry(s, { depth: depth + overhang * 2, bevelEnabled: false });
  geo.translate(0, 0, -(depth + overhang * 2) / 2);
  const m = new Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/** Window: frame plus glass, set into a wall that faces +z (rotate the group for other walls). */
function windowUnit(w, h, M) {
  const g = new Group();
  g.add(box(w + 0.14, h + 0.14, 0.08, M.frame, 0, 0, 0.0));
  const glass = new Mesh(new BoxGeometry(w, h, 0.1), M.glass);
  glass.position.z = 0.02;
  g.add(glass);
  return g;
}

function placeOnWall(unit, x, y, z, rotY = 0) {
  unit.position.set(x, y, z);
  unit.rotation.y = rotY;
  return unit;
}

/* Procedural models, driven by model_params from the database */
function buildGable(p, M) {
  const g = new Group();
  const w = p.width ?? 7;
  const d = p.depth ?? 6;
  const h = 2.8;
  g.add(box(w + 0.4, 0.35, d + 0.4, M.plinth, 0, 0.175, 0));
  g.add(box(w, h, d, M.wall, 0, 0.35 + h / 2, 0));
  const roof = gableRoof(d, w, 1.9, 0.45, M.roof);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 0.35 + h;
  g.add(roof);
  // front (+z) windows and door
  g.add(placeOnWall(windowUnit(1.5, 1.2, M), -w / 4 - 0.4, 1.95, d / 2 + 0.02));
  g.add(placeOnWall(windowUnit(1.5, 1.2, M), w / 4 + 0.4, 1.95, d / 2 + 0.02));
  g.add(box(0.95, 2.1, 0.08, M.door, 0, 0.35 + 1.05, d / 2 + 0.04));
  // side and back windows
  g.add(placeOnWall(windowUnit(1.1, 1.0, M), w / 2 + 0.02, 1.95, 0, Math.PI / 2));
  g.add(placeOnWall(windowUnit(1.6, 1.0, M), 0, 1.95, -d / 2 - 0.02, Math.PI));
  // covered veranda
  const vd = p.veranda ?? 2.2;
  g.add(box(w, 0.2, vd, M.deck, 0, 0.3, d / 2 + vd / 2));
  const vroof = box(w + 0.6, 0.12, vd + 0.4, M.roof, 0, 0.35 + h - 0.15, d / 2 + vd / 2 + 0.1);
  vroof.rotation.x = 0.08;
  g.add(vroof);
  for (const x of [-w / 2 + 0.15, 0, w / 2 - 0.15]) g.add(box(0.14, h - 0.3, 0.14, M.post, x, 0.4 + (h - 0.3) / 2, d / 2 + vd - 0.1));
  // rainwater tank
  const tank = new Mesh(new CylinderGeometry(0.75, 0.75, 1.9, 24), M.tank);
  tank.position.set(w / 2 + 1.3, 0.95, -d / 4);
  tank.castShadow = true;
  g.add(tank);
  return g;
}

function buildLShape(p, M) {
  const g = new Group();
  const h = 2.8;
  // Living wing along x at the back, bedroom wing along z on the right.
  const lw = 7;
  const ld = 5;
  const bw = 4.6;
  const bd = 9;
  const lx = -2.2;
  const lz = -2;
  const bx = lx + lw / 2 + bw / 2;
  const bz = lz - ld / 2 + bd / 2;
  g.add(box(lw + 0.4, 0.35, ld + 0.4, M.plinth, lx, 0.175, lz));
  g.add(box(bw + 0.4, 0.35, bd + 0.4, M.plinth, bx, 0.175, bz));
  g.add(box(lw, h, ld, M.wall, lx, 0.35 + h / 2, lz));
  g.add(box(bw, h, bd, M.wall, bx, 0.35 + h / 2, bz));
  const r1 = gableRoof(ld, lw, 1.6, 0.4, M.roof);
  r1.rotation.y = Math.PI / 2;
  r1.position.set(lx - 0.2, 0.35 + h, lz);
  g.add(r1);
  const r2 = gableRoof(bw, bd, 1.6, 0.4, M.roof);
  r2.position.set(bx, 0.35 + h, bz);
  g.add(r2);
  g.add(placeOnWall(windowUnit(2.2, 1.3, M), lx - 1.2, 1.9, lz + ld / 2 + 0.02));
  g.add(box(0.95, 2.1, 0.08, M.door, lx + 1.6, 0.35 + 1.05, lz + ld / 2 + 0.04));
  g.add(placeOnWall(windowUnit(1.3, 1.1, M), bx - bw / 2 - 0.02, 1.95, bz + 1.6, -Math.PI / 2));
  g.add(placeOnWall(windowUnit(1.3, 1.1, M), bx, 1.95, bz + bd / 2 + 0.02));
  g.add(placeOnWall(windowUnit(1.3, 1.1, M), bx + bw / 2 + 0.02, 1.95, bz - 1.5, Math.PI / 2));
  g.add(placeOnWall(windowUnit(1.3, 1.1, M), bx + bw / 2 + 0.02, 1.95, bz + 2.2, Math.PI / 2));
  // veranda in the corner of the L
  const vw = lw;
  const vd = p.veranda ?? 2;
  g.add(box(vw, 0.2, vd, M.deck, lx, 0.3, lz + ld / 2 + vd / 2));
  g.add(box(vw + 0.3, 0.12, vd + 0.3, M.roof, lx, 0.35 + h - 0.1, lz + ld / 2 + vd / 2));
  for (const x of [lx - vw / 2 + 0.15, lx + vw / 2 - 0.4]) g.add(box(0.14, h - 0.2, 0.14, M.post, x, 0.4 + (h - 0.2) / 2, lz + ld / 2 + vd - 0.1));
  return g;
}

function buildCourtyard(p, M) {
  const g = new Group();
  const h = 3.0;
  const W = p.width ?? 12;
  const D = p.depth ?? 11;
  const t = 4.2; // wing depth
  const wings = [
    [0, -D / 2 + t / 2, W, t], // back wing
    [-W / 2 + t / 2, 0.6, t, D - t + 1.2], // left wing
    [W / 2 - t / 2, 0.6, t, D - t + 1.2], // right wing
  ];
  for (const [x, z, w, d] of wings) {
    g.add(box(w + 0.3, 0.35, d + 0.3, M.plinth, x, 0.175, z));
    g.add(box(w, h, d, M.wall, x, 0.35 + h / 2, z));
    g.add(box(w + 0.5, 0.35, d + 0.5, M.flatRoof, x, 0.35 + h + 0.17, z));
  }
  // courtyard paving and planting
  g.add(box(W - 2 * t, 0.12, D - t, M.paving, 0, 0.06, t / 2 - 0.2 + 0.4));
  const tree = new Mesh(new CylinderGeometry(0.9, 1.3, 1.6, 7), M.plant);
  tree.position.set(0, 1.2, 1.2);
  tree.castShadow = true;
  g.add(tree);
  // pergola across the courtyard opening
  const pz = D / 2 - 0.4;
  for (let i = 0; i < 9; i++) {
    const x = -W / 2 + t + 0.3 + (i * (W - 2 * t - 0.6)) / 8;
    g.add(box(0.12, 0.18, 3.2, M.door, x, 0.35 + h - 0.2, pz - 1.2));
  }
  g.add(box(W - 2 * t, 0.18, 0.18, M.door, 0, 0.35 + h - 0.35, pz + 0.3));
  for (const x of [-W / 2 + t + 0.2, W / 2 - t - 0.2]) g.add(box(0.16, h - 0.4, 0.16, M.door, x, 0.35 + (h - 0.4) / 2, pz + 0.3));
  // windows facing out
  for (const x of [-W / 2 + t / 2, W / 2 - t / 2]) g.add(placeOnWall(windowUnit(2.2, 1.3, M), x, 2.0, D / 2 - t / 2 + 1.2 + 0.62));
  g.add(placeOnWall(windowUnit(1.4, 1.1, M), -W / 2 - 0.02, 2.0, -1, -Math.PI / 2));
  g.add(placeOnWall(windowUnit(1.4, 1.1, M), W / 2 + 0.02, 2.0, 1.5, Math.PI / 2));
  g.add(placeOnWall(windowUnit(2.6, 1.1, M), 0, 2.0, -D / 2 - 0.02, Math.PI));
  g.add(placeOnWall(windowUnit(3, 2.0, M), 0, 1.5, -D / 2 + t + 0.02));
  // carport on the right
  const cw = p.carport ?? 3.2;
  const cx = W / 2 + cw / 2 + 0.2;
  g.add(box(cw, 0.1, 5.6, M.paving, cx, 0.05, 1.4));
  g.add(box(cw + 0.3, 0.16, 5.8, M.flatRoof, cx, 2.6, 1.4));
  for (const z of [-1.2, 4.0]) g.add(box(0.14, 2.5, 0.14, M.post, cx + cw / 2, 1.3, z));
  return g;
}

const BUILDERS = { gable: buildGable, lshape: buildLShape, courtyard: buildCourtyard };

export function createHomesViewer(frame, { models, initial, autoRotate = true }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'viewer__canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  frame.appendChild(canvas);

  const mobile = window.matchMedia('(pointer: coarse)').matches;
  const renderer = createRenderer(canvas, { pixelRatio: Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2), shadows: true });
  const scene = new Scene();
  scene.environment = skyEnvironment(renderer, { sun: false });
  const skies = { day: skyDome(220, MOODS.day.sky), evening: skyDome(220, MOODS.evening.sky) };
  scene.add(skies.day, skies.evening);

  const camera = new PerspectiveCamera(30, 4 / 3, 2, 300);
  const hemi = new HemisphereLight(0xdcebfa, 0xe7e1d4, 1);
  const sun = new DirectionalLight(0xfff1dc, 2.3);
  sun.position.set(-14, 22, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 5, far: 70 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 4;
  scene.add(hemi, sun);

  // ground disc, lawn and a soft contact shadow
  const M = materials();
  scene.fog = new Fog(0xeef4f9, 45, 110);
  const ground = new Mesh(new CircleGeometry(160, 64), M.lawn);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const contact = new Mesh(
    new PlaneGeometry(22, 22),
    new MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.6 }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.02;
  scene.add(contact);

  const turntable = new Group();
  scene.add(turntable);
  let model = null;
  let slug = null;
  let mood = 'day';
  let yaw = -0.6;
  let pitch = 0.2;
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
    const build = BUILDERS[def.params?.type] || buildGable;
    model = build(def.params || {}, M);
    turntable.add(model);
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
    const dist = 34;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 1, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(new Vector3(0, 1.6, 0));
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
    pitch = Math.min(0.8, Math.max(0.08, dragging.pitch + (e.clientY - dragging.y) * 0.004));
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
  return api;
}
