// The homepage hero: one corporate campus drawn, built and handed over in daylight.
// Exposes update(progress, pointer), render(), setSize() and dispose(). See the 3D spec in the brief.
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import {
  canvasTexture,
  contactShadowTexture,
  createRenderer,
  disposeTree,
  easeOut,
  facadeTextures,
  lerp,
  range,
  skyDome,
  skyEnvironment,
  smooth,
} from './three-common.js';

const COLORS = {
  ink: 0x0b2a4a,
  brandDeep: 0x0b6fa8,
  accent: 0xf26a21,
  cloud: 0xf4f8fb,
  mist: 0xe6eef5,
  concrete: 0xe8ecef,
  slab: 0xeef1f4,
  column: 0xd9dfe5,
  asphalt: 0x8d969e,
  paving: 0xe3e7ea,
  lawn: 0xc4dda8,
  earth: 0xd2e2bf,
};

// Building definitions. Units are metres; +z is the front of the site.
const BUILDINGS = [
  { id: 'podium', x: 6, z: -2, w: 58, d: 30, floors: 2, fh: 3.6, build: [0.32, 0.42], wall: [0.62, 0.7] },
  { id: 'wing', x: -31, z: -6, w: 18, d: 36, floors: 5, fh: 3.6, build: [0.35, 0.5], wall: [0.63, 0.73] },
  { id: 'tower', x: 10, z: -5, w: 22, d: 18, floors: 14, fh: 3.6, build: [0.37, 0.61], wall: [0.62, 0.78] },
];

// Camera path as spherical coordinates around a moving target. theta 0 looks from the front (+z).
const CAMERA_KEYS = [
  { p: 0.0, r: 190, theta: 0.0, phi: 0.012, target: [0, 0, 2] },
  { p: 0.28, r: 180, theta: 0.22, phi: 0.62, target: [0, 0, 0] },
  { p: 0.42, r: 200, theta: 0.82, phi: 1.04, target: [2, 16, -2] },
  { p: 0.66, r: 196, theta: -0.78, phi: 1.12, target: [2, 22, -2] },
  { p: 0.84, r: 175, theta: -0.34, phi: 1.44, target: [0, 19, 0] },
  { p: 1.0, r: 168, theta: -0.24, phi: 1.535, target: [0, 18, 4] },
];

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpS = new Vector3();
const tmpP = new Vector3();

export function createHeroScene(canvas, settings) {
  const renderer = createRenderer(canvas, settings);
  const scene = new Scene();
  scene.fog = new Fog(0xeef4f9, 260, 680);
  // Daylight sky dome drawn in the scene, so live frames and pre-rendered stills match.
  const sky = skyDome(1100, { top: '#93C5EC', mid: '#C8E0F3', horizon: '#EEF4F9' });
  scene.add(sky);
  scene.environment = skyEnvironment(renderer);
  scene.environmentIntensity = 0.85;

  const camera = new PerspectiveCamera(34, 16 / 10, 2, 1400);
  const root = new Group();
  scene.add(root);

  /* Lights */
  const hemi = new HemisphereLight(0xdcebfa, 0xe9e2d3, 1.1);
  scene.add(hemi);
  const sun = new DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-90, 130, 95);
  sun.castShadow = settings.shadows;
  if (settings.shadows) {
    sun.shadow.mapSize.set(settings.shadowSize, settings.shadowSize);
    const s = sun.shadow.camera;
    s.left = -95;
    s.right = 95;
    s.top = 95;
    s.bottom = -95;
    s.near = 20;
    s.far = 420;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.35;
    sun.shadow.radius = 5;
  }
  scene.add(sun);

  /* Ground layers, each at least 0.02 m apart to avoid z-fighting */
  const flat = (w, d, color, x, y, z, opts = {}) => {
    const m = new Mesh(new PlaneGeometry(w, d), new MeshStandardMaterial({ color, roughness: 0.95, ...opts }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = settings.shadows;
    root.add(m);
    return m;
  };
  const base = new Mesh(new CircleGeometry(700, 48), new MeshStandardMaterial({ color: COLORS.earth, roughness: 1 }));
  base.rotation.x = -Math.PI / 2;
  base.receiveShadow = settings.shadows;
  root.add(base);
  flat(170, 130, COLORS.lawn, 0, 0.02, 4);
  flat(116, 62, COLORS.paving, -4, 0.04, -4);
  flat(72, 22, COLORS.concrete, 6, 0.06, 27);
  flat(260, 11, COLORS.asphalt, 0, 0.08, 47, { roughness: 0.85 });
  flat(9, 18, COLORS.asphalt, 40, 0.1, 33, { roughness: 0.85 });
  flat(36, 20, COLORS.asphalt, -44, 0.1, 29, { roughness: 0.85 });
  flat(30, 34, COLORS.asphalt, 58, 0.1, 6, { roughness: 0.85 });

  // Car park bay lines
  const bayLines = [];
  const bays = (x0, z0, cols, rows, bw, bd, gap) => {
    for (let r = 0; r < rows; r++) {
      const z = z0 + r * (bd + gap);
      for (let c = 0; c <= cols; c++) {
        const x = x0 + c * bw;
        bayLines.push(x, 0.13, z, x, 0.13, z + bd);
      }
    }
  };
  bays(-60, 20.5, 12, 2, 2.6, 5, 7);
  bays(46, -10, 9, 3, 2.6, 5, 6);
  const bayGeo = new BufferGeometry();
  bayGeo.setAttribute('position', new Float32BufferAttribute(bayLines, 3));
  root.add(new LineSegments(bayGeo, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })));

  // Soft contact shadow under the campus
  const contact = new Mesh(
    new PlaneGeometry(150, 96),
    new MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0 }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(-4, 0.16, -4);
  root.add(contact);

  /* Buildings */
  const facade = facadeTextures();
  const slabMat = new MeshStandardMaterial({ color: COLORS.slab, roughness: 0.7 });
  const columnMat = new MeshStandardMaterial({ color: COLORS.column, roughness: 0.8 });
  const padMat = new MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.9 });
  const roofMat = new MeshStandardMaterial({ color: 0xdfe5ea, roughness: 0.6 });

  const facadeMaterial = (width, floors, plane) => {
    const rx = width / 12;
    const ry = floors / facade.tileFloors;
    const map = facade.color.clone();
    const rough = facade.rough.clone();
    const metal = facade.metal.clone();
    for (const t of [map, rough, metal]) {
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
    }
    return new MeshStandardMaterial({
      map,
      roughnessMap: rough,
      metalnessMap: metal,
      roughness: 0.55,
      metalness: 1,
      envMapIntensity: 1.15,
      clippingPlanes: [plane],
    });
  };

  const buildings = BUILDINGS.map((def) => {
    const H = def.floors * def.fh;
    const group = new Group();
    group.position.set(def.x, 0, def.z);
    root.add(group);

    const pad = new Mesh(new BoxGeometry(def.w + 2.4, 0.6, def.d + 2.4), padMat);
    pad.position.y = 0.3;
    pad.receiveShadow = settings.shadows;
    group.add(pad);

    // Slabs: index 0 is the ground slab, then one per floor top. Edges protrude 0.2 m past the facade.
    const slabs = new InstancedMesh(new BoxGeometry(def.w + 0.4, 0.32, def.d + 0.4), slabMat, def.floors + 1);
    for (let k = 0; k <= def.floors; k++) {
      tmpM.makeTranslation(0, 0.6 + k * def.fh, 0);
      slabs.setMatrixAt(k, tmpM);
    }
    slabs.count = 0;
    slabs.castShadow = slabs.receiveShadow = settings.shadows;
    group.add(slabs);

    // Perimeter columns, inset from the facade line.
    const nx = Math.max(2, Math.round(def.w / 5.5) + 1);
    const nz = Math.max(2, Math.round(def.d / 5.5) + 1);
    const ring = [];
    const hx = def.w / 2 - 0.8;
    const hz = def.d / 2 - 0.8;
    for (let i = 0; i < nx; i++) {
      const x = -hx + (2 * hx * i) / (nx - 1);
      ring.push([x, -hz], [x, hz]);
    }
    for (let j = 1; j < nz - 1; j++) {
      const z = -hz + (2 * hz * j) / (nz - 1);
      ring.push([-hx, z], [hx, z]);
    }
    const columns = new InstancedMesh(new BoxGeometry(0.7, 1, 0.7), columnMat, ring.length * def.floors);
    columns.count = 0;
    columns.castShadow = settings.shadows;
    group.add(columns);

    // Curtain wall revealed from the ground up with a clipping plane, so the texture never stretches.
    const plane = new Plane(new Vector3(0, -1, 0), 0);
    const sideZ = facadeMaterial(def.w, def.floors, plane);
    const sideX = facadeMaterial(def.d, def.floors, plane);
    const top = roofMat.clone();
    top.clippingPlanes = [plane];
    const wallGeo = new BoxGeometry(def.w, H, def.d);
    wallGeo.translate(0, H / 2 + 0.6, 0);
    const wall = new Mesh(wallGeo, [sideX, sideX, top, top, sideZ, sideZ]);
    wall.castShadow = wall.receiveShadow = settings.shadows;
    wall.visible = false;
    group.add(wall);

    return { def, H, group, pad, slabs, columns, ring, wall, plane, lastKey: '' };
  });

  /* Entrance atrium and orange canopy */
  const atrium = new Group();
  atrium.position.set(10, 0.6, 15.6);
  root.add(atrium);
  const glass = new Mesh(
    new BoxGeometry(14, 7.4, 5),
    new MeshStandardMaterial({ color: 0xcfe6f7, metalness: 0.4, roughness: 0.06, transparent: true, opacity: 0.6 }),
  );
  glass.position.y = 3.7;
  atrium.add(glass);
  const frameMat = new MeshStandardMaterial({ color: 0xd3dfea, roughness: 0.5 });
  for (const x of [-7, -3.5, 0, 3.5, 7]) {
    const mull = new Mesh(new BoxGeometry(0.18, 7.4, 0.18), frameMat);
    mull.position.set(x, 3.7, 2.5);
    atrium.add(mull);
  }
  const canopyMat = new MeshStandardMaterial({ color: COLORS.accent, roughness: 0.55 });
  const canopy = new Mesh(new BoxGeometry(19, 0.45, 7.5), canopyMat);
  canopy.position.set(0, 7.9, 3.6);
  canopy.castShadow = settings.shadows;
  atrium.add(canopy);
  for (const x of [-8.6, 8.6]) {
    const post = new Mesh(new BoxGeometry(0.35, 7.7, 0.35), frameMat);
    post.position.set(x, 3.85, 6.9);
    atrium.add(post);
  }
  atrium.scale.set(1, 0.001, 1);
  atrium.visible = false;

  /* Tower crane in the accent colour, with a see-through lattice */
  const lattice = canvasTexture(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
  });
  const craneMat = new MeshStandardMaterial({
    color: COLORS.accent,
    roughness: 0.5,
    alphaMap: lattice,
    alphaTest: 0.5,
    side: DoubleSide,
  });
  const craneSolid = new MeshStandardMaterial({ color: COLORS.accent, roughness: 0.5 });
  const crane = new Group();
  crane.position.set(30, 0, -20);
  root.add(crane);
  const mastH = 66;
  const mastGeo = new BoxGeometry(2, mastH, 2);
  mastGeo.translate(0, mastH / 2, 0);
  lattice.repeat.set(1, mastH / 2);
  const mast = new Mesh(mastGeo, craneMat);
  mast.castShadow = settings.shadows;
  crane.add(mast);
  const slew = new Group();
  slew.position.y = mastH;
  crane.add(slew);
  const jibTex = lattice.clone();
  jibTex.repeat.set(26, 1);
  jibTex.needsUpdate = true;
  const jibMat = craneMat.clone();
  jibMat.alphaMap = jibTex;
  const jib = new Mesh(new BoxGeometry(52, 1.8, 1.8), jibMat);
  jib.position.x = -22;
  jib.castShadow = settings.shadows;
  slew.add(jib);
  const cab = new Mesh(new BoxGeometry(3, 2.6, 2.6), new MeshStandardMaterial({ color: 0xf4f8fb, roughness: 0.4 }));
  cab.position.set(2.5, -1.6, 0);
  slew.add(cab);
  const counterJib = new Mesh(new BoxGeometry(14, 1.4, 1.6), craneSolid);
  counterJib.position.x = 6.5;
  slew.add(counterJib);
  const weight = new Mesh(new BoxGeometry(4, 2.6, 2.6), new MeshStandardMaterial({ color: 0x9aa6b1, roughness: 0.8 }));
  weight.position.set(11, -1.6, 0);
  slew.add(weight);
  const apex = new Mesh(new BoxGeometry(1.2, 7, 1.2), craneSolid);
  apex.position.y = 4.4;
  slew.add(apex);
  const cableGeo = new BufferGeometry();
  cableGeo.setAttribute('position', new Float32BufferAttribute([-30, 0, 0, -30, -26, 0], 3));
  slew.add(new LineSegments(cableGeo, new LineBasicMaterial({ color: 0x4a6075 })));
  crane.visible = false;

  /* Trees, cars and lamp posts as instanced meshes */
  const density = settings.density;
  const treeSpots = [];
  for (let x = -110; x <= 110; x += 11) treeSpots.push([x + ((x * 7) % 5), 55 + ((x * 13) % 4)]);
  for (let z = -50; z <= 36; z += 10) treeSpots.push([-78 + ((z * 3) % 4), z], [80 + ((z * 5) % 3), z]);
  for (let x = -60; x <= 70; x += 12) treeSpots.push([x, -44 + ((x * 11) % 5)]);
  treeSpots.push([-16, 30], [-8, 33], [28, 30], [36, 24], [-24, 22]);
  const trees = treeSpots.filter((_, i) => density >= 1 || i % 2 === 0);

  const trunkMesh = new InstancedMesh(
    new CylinderGeometry(0.22, 0.32, 2.6, 6).translate(0, 1.3, 0),
    new MeshStandardMaterial({ color: 0x8a7a68, roughness: 1 }),
    trees.length,
  );
  const crownMesh = new InstancedMesh(
    new IcosahedronGeometry(2.6, 1).translate(0, 4.6, 0),
    new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
    trees.length,
  );
  const greens = [0x7fb24a, 0x86b94f, 0x6fa143, 0x93c35e].map((c) => new Color(c));
  trees.forEach((_, i) => crownMesh.setColorAt(i, greens[i % greens.length]));
  trunkMesh.castShadow = crownMesh.castShadow = settings.shadows;
  root.add(trunkMesh, crownMesh);

  const carSpots = [];
  for (let c = 0; c < 12; c++) for (let r = 0; r < 2; r++) if ((c * 3 + r * 5) % 4 !== 0) carSpots.push([-58.7 + c * 2.6, 23 + r * 12, 0]);
  for (let c = 0; c < 9; c++) for (let r = 0; r < 3; r++) if ((c + r * 2) % 3 !== 0) carSpots.push([47.3 + c * 2.6, -7.5 + r * 11, 0]);
  const cars = carSpots.filter((_, i) => density >= 1 || i % 2 === 0);
  const carBody = new InstancedMesh(
    new BoxGeometry(1.9, 1.0, 4.4).translate(0, 0.75, 0),
    new MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.4 }),
    cars.length,
  );
  const carTop = new InstancedMesh(
    new BoxGeometry(1.7, 0.75, 2.3).translate(0, 1.6, -0.2),
    new MeshStandardMaterial({ color: 0x7d93a8, roughness: 0.2, metalness: 0.5 }),
    cars.length,
  );
  const paints = [0xffffff, 0xc5ccd3, 0x0b2a4a, 0x5d6b78, 0xe9eef2, 0x9fb6cc].map((c) => new Color(c));
  cars.forEach((_, i) => carBody.setColorAt(i, paints[(i * 7) % paints.length]));
  carBody.castShadow = settings.shadows;
  root.add(carBody, carTop);

  const lampSpots = [];
  for (let x = -100; x <= 100; x += 20) lampSpots.push([x, 41]);
  const lampPole = new InstancedMesh(
    new CylinderGeometry(0.1, 0.14, 7, 6).translate(0, 3.5, 0),
    new MeshStandardMaterial({ color: 0x4a6075, roughness: 0.6 }),
    lampSpots.length,
  );
  const lampHead = new InstancedMesh(
    new BoxGeometry(1.4, 0.25, 0.5).translate(0.6, 7, 0),
    new MeshStandardMaterial({ color: 0x4a6075, roughness: 0.6 }),
    lampSpots.length,
  );
  root.add(lampPole, lampHead);

  /* Blueprint: drawing paper and a site plan that draws itself */
  const paperTex = canvasTexture(512, 512, (ctx, w) => {
    ctx.fillStyle = '#F4F8FB';
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = '#E2EAF2';
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, w);
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(w, i + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = '#D3DFEA';
    for (let i = 0; i <= w; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, w);
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(w, i + 0.5);
      ctx.stroke();
    }
  });
  paperTex.repeat.set(12, 12);
  const paper = new Mesh(
    new PlaneGeometry(1200, 1200),
    new MeshBasicMaterial({ map: paperTex, transparent: true, depthWrite: false, fog: false }),
  );
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = 0.3;
  paper.renderOrder = 1;
  root.add(paper);

  const planPts = [];
  const rect = (x0, z0, x1, z1) => planPts.push(x0, 0, z0, x1, 0, z0, x1, 0, z0, x1, 0, z1, x1, 0, z1, x0, 0, z1, x0, 0, z1, x0, 0, z0);
  rect(-82, -52, 86, 54); // site boundary
  for (const b of BUILDINGS) rect(b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2);
  rect(3, 13, 17, 18.5); // atrium
  rect(-62, 19, -26, 39); // car park west
  rect(43, -11, 73, 23); // car park east
  rect(-130, 41.5, 130, 52.5); // road
  rect(35.5, 24, 44.5, 41.5); // access drive
  // dimension lines along the front
  planPts.push(-82, 0, 60, 86, 0, 60, -82, 0, 57, -82, 0, 63, 86, 0, 57, 86, 0, 63);
  const gridPts = [];
  for (const b of BUILDINGS) {
    const step = 6;
    for (let x = b.x - b.w / 2; x <= b.x + b.w / 2 + 0.01; x += step) gridPts.push(x, 0, b.z - b.d / 2 - 4, x, 0, b.z + b.d / 2 + 4);
    for (let z = b.z - b.d / 2; z <= b.z + b.d / 2 + 0.01; z += step) gridPts.push(b.x - b.w / 2 - 4, 0, z, b.x + b.w / 2 + 4, 0, z);
  }
  const planGeo = new BufferGeometry();
  planGeo.setAttribute('position', new Float32BufferAttribute(planPts, 3));
  const gridGeo = new BufferGeometry();
  gridGeo.setAttribute('position', new Float32BufferAttribute(gridPts, 3));
  const planMat = new LineBasicMaterial({ color: COLORS.brandDeep, transparent: true, depthWrite: false, fog: false });
  const gridMat = new LineBasicMaterial({ color: COLORS.brandDeep, transparent: true, opacity: 0.32, depthWrite: false, fog: false });
  const plan = new LineSegments(planGeo, planMat);
  const grid = new LineSegments(gridGeo, gridMat);
  plan.position.y = grid.position.y = 0.45;
  plan.renderOrder = grid.renderOrder = 2;
  root.add(plan, grid);
  const planCount = planPts.length / 3;
  const gridCount = gridPts.length / 3;

  /* State */
  let width = 1;
  let height = 1;
  let offsetX = 0;
  let portrait = false;
  let progress = -1;
  const pointer = { x: 0, y: 0 };
  const target = new Vector3();
  const dummy = new Object3D();

  function setSize(w, h, layout = {}) {
    width = Math.max(1, Math.floor(w));
    height = Math.max(1, Math.floor(h));
    offsetX = layout.offsetX ?? 0;
    portrait = width / height < 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (offsetX) camera.setViewOffset(width, height, -width * offsetX, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    progress = -1;
  }

  function cameraAt(p) {
    let i = 0;
    while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].p) i++;
    const a = CAMERA_KEYS[i];
    const b = CAMERA_KEYS[i + 1];
    const t = smooth(range(p, a.p, b.p));
    let r = lerp(a.r, b.r, t);
    const theta = lerp(a.theta, b.theta, t);
    const phi = lerp(a.phi, b.phi, t);
    target.set(lerp(a.target[0], b.target[0], t), lerp(a.target[1], b.target[1], t), lerp(a.target[2], b.target[2], t));
    if (portrait) {
      // Narrow screens pull back further while the whole site plan has to fit, less at the handover.
      r *= Math.min(2.2, lerp(1.55, 1.0, smooth(range(p, 0.2, 0.9))) / (width / height));
      target.y += 8 * smooth(range(p, 0.3, 0.7));
    }
    camera.position.set(
      target.x + r * Math.sin(phi) * Math.sin(theta) + pointer.x * 3,
      target.y + r * Math.cos(phi) + pointer.y * 2,
      target.z + r * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(target);
  }

  function updateBuilding(b, p) {
    const { def } = b;
    const t = range(p, def.build[0], def.build[1]);
    const padT = range(p, def.build[0] - 0.03, def.build[0] + 0.01);
    b.pad.visible = padT > 0;
    b.pad.scale.y = Math.max(0.001, easeOut(padT));
    const built = t * def.floors;
    const full = Math.floor(built);
    const frac = built - full;
    const key = `${full}:${frac.toFixed(3)}`;
    if (key !== b.lastKey) {
      b.lastKey = key;
      const per = b.ring.length;
      let n = 0;
      const floorsToDraw = Math.min(def.floors, full + (frac > 0 ? 1 : 0));
      for (let f = 0; f < floorsToDraw; f++) {
        const h = f < full ? 1 : frac;
        for (const [x, z] of b.ring) {
          tmpP.set(x, 0.6 + 0.16 + f * def.fh + (def.fh * h) / 2, z);
          tmpS.set(1, Math.max(0.001, def.fh * h), 1);
          tmpM.compose(tmpP, tmpQ.identity(), tmpS);
          b.columns.setMatrixAt(n++, tmpM);
        }
      }
      b.columns.count = floorsToDraw * per;
      b.columns.instanceMatrix.needsUpdate = true;
      b.slabs.count = t > 0 ? 1 + full : 0;
    }
    const w = range(p, def.wall[0], def.wall[1]);
    b.wall.visible = w > 0;
    b.plane.constant = 0.6 + b.H * easeOut(w) + 0.01;
  }

  function placeInstances(mesh, spots, p, from, to, build) {
    const n = spots.length;
    for (let i = 0; i < n; i++) {
      const start = from + ((to - from) * 0.6 * i) / n;
      const s = easeOut(range(p, start, start + (to - from) * 0.4));
      build(dummy, spots[i], Math.max(0.0001, s), i);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function update(p, ptr = { x: 0, y: 0 }) {
    pointer.x = ptr.x;
    pointer.y = ptr.y;
    progress = p;

    // Blueprint: paper fades into daylight, the plan draws itself then fades.
    const paperFade = range(p, 0.3, 0.42);
    paper.material.opacity = 1 - paperFade;
    paper.visible = paperFade < 1;
    // A little of the plan is already drawn at the top of the page, so the first frame is never blank.
    const draw = range(p, -0.05, 0.26);
    plan.geometry.setDrawRange(0, Math.floor((planCount * draw) / 2) * 2);
    grid.geometry.setDrawRange(0, Math.floor((gridCount * range(p, 0.06, 0.29)) / 2) * 2);
    const planFade = 1 - range(p, 0.36, 0.5);
    planMat.opacity = planFade;
    gridMat.opacity = 0.32 * planFade;
    plan.visible = grid.visible = planFade > 0;

    contact.material.opacity = 0.55 * range(p, 0.34, 0.6);

    for (const b of buildings) updateBuilding(b, p);

    const at = range(p, 0.64, 0.72);
    atrium.visible = at > 0;
    atrium.scale.y = Math.max(0.001, easeOut(at));

    // Crane: rises with the tower, slews while working, then retracts and leaves.
    const craneIn = range(p, 0.31, 0.36);
    const craneOut = range(p, 0.8, 0.9);
    crane.visible = craneIn > 0 && craneOut < 1;
    const tower = range(p, BUILDINGS[2].build[0], BUILDINGS[2].build[1]);
    crane.scale.y = Math.max(0.001, easeOut(craneIn) * (0.45 + 0.55 * tower) * (1 - easeOut(craneOut)));
    crane.scale.x = crane.scale.z = 1;
    slew.rotation.y = -0.4 + p * 2.6;

    placeInstances(trunkMesh, trees, p, 0.7, 0.9, (o, [x, z], s) => {
      o.position.set(x, 0, z);
      o.scale.setScalar(s);
    });
    placeInstances(crownMesh, trees, p, 0.7, 0.9, (o, [x, z], s, i) => {
      o.position.set(x, 0, z);
      o.scale.setScalar(s * (0.85 + ((i * 37) % 10) / 30));
    });
    const carT = (o, [x, z], s) => {
      o.position.set(x, s < 0.01 ? -5 : 0, z + (1 - s) * 18);
      o.scale.setScalar(s < 0.01 ? 0.0001 : 1);
    };
    placeInstances(carBody, cars, p, 0.74, 0.94, carT);
    placeInstances(carTop, cars, p, 0.74, 0.94, carT);
    placeInstances(lampPole, lampSpots, p, 0.68, 0.84, (o, [x, z], s) => {
      o.position.set(x, 0, z);
      o.scale.set(1, s, 1);
    });
    placeInstances(lampHead, lampSpots, p, 0.68, 0.84, (o, [x, z], s) => {
      o.position.set(x, 0, z);
      o.scale.set(1, s, 1);
    });

    cameraAt(p);
  }

  function render() {
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  /** Renders one frame at a fixed size and progress, for the pre-rendered stills. */
  function still(p, w, h, layout, type = 'image/webp', quality = 0.82) {
    setSize(w, h, layout);
    update(p, { x: 0, y: 0 });
    render();
    return renderer.domElement.toDataURL(type, quality);
  }

  function dispose() {
    disposeTree(scene);
    scene.environment?.dispose();
    renderer.dispose();
  }

  return {
    renderer,
    setSize,
    update,
    render,
    still,
    dispose,
    get progress() {
      return progress;
    },
    stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
  };
}
