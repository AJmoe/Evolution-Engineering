// Homepage hero controller: scroll progress, stage copy and tracker, and choosing
// between the live 3D scene and the pre-rendered stills.
import { scrollProgress } from './scroll-progress.js';
import { initialTier, isMobile, settingsFor } from './quality.js';

const STAGES = [
  [0, 0.3],
  [0.3, 0.68],
  [0.68, 1],
];
const STEP_DOWN = { high: 'medium', medium: 'stills' };

const idle = (fn) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2500 }) : window.setTimeout(fn, 600);

export function initHero(hero) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  const track = hero.querySelector('[data-hero-track]');
  const media = hero.querySelector('[data-hero-media]');
  const texts = [...hero.querySelectorAll('[data-stage-text]')];
  const bars = [...hero.querySelectorAll('[data-stage-bar]')];
  const buttons = [...hero.querySelectorAll('[data-stage-go]')];
  const hint = hero.querySelector('[data-scroll-hint]');
  const stagesSection = document.querySelector('[data-hero-stages]');

  hero.classList.add('is-film');
  if (stagesSection) stagesSection.hidden = true;

  let view = null; // the active renderer: 3D scene or stills
  let activeStage = -1;
  const reached = new Set();

  const ui = (p) => {
    const stage = p < STAGES[1][0] ? 0 : p < STAGES[2][0] ? 1 : 2;
    if (stage !== activeStage) {
      activeStage = stage;
      texts.forEach((t, i) => t.classList.toggle('is-active', i === stage));
      buttons.forEach((b, i) => b.setAttribute('aria-current', i === stage ? 'step' : 'false'));
      if (!reached.has(stage)) {
        reached.add(stage);
        document.dispatchEvent(new CustomEvent('ee:hero-stage', { detail: { stage: ['Blueprint', 'Build', 'Handover'][stage] } }));
      }
    }
    bars.forEach((bar, i) => {
      const [a, b] = STAGES[i];
      const fill = Math.min(1, Math.max(0, (p - a) / (b - a)));
      bar.style.setProperty('--fill', `${(fill * 100).toFixed(1)}%`);
    });
    if (hint) hint.classList.toggle('is-gone', p > 0.03);
  };

  const progress = scrollProgress(track, (p) => {
    ui(p);
    view?.update(p);
  });

  buttons.forEach((b, i) =>
    b.addEventListener('click', () => progress.scrollTo(i === 0 ? 0 : STAGES[i][0] + 0.01)),
  );

  const useStills = async () => {
    view?.dispose();
    view = null;
    const { createStills } = await import('./fallback-stills.js');
    view = createStills(media);
    view.update(progress.value);
    hero.classList.add('is-ready');
  };

  const useScene = async (tier) => {
    const { createHeroScene } = await import('./hero-scene.js');
    view = startScene(createHeroScene, tier, hero, media, () => progress.value, (next) => {
      view?.dispose();
      view = null;
      if (next === 'stills') useStills();
      else useScene(next);
    });
  };

  const tier = initialTier();
  if (tier === 'stills') {
    idle(useStills);
  } else {
    idle(() => useScene(tier).catch(useStills));
  }

  reduce.addEventListener('change', (e) => {
    if (e.matches) window.location.reload();
  });
}

function startScene(createHeroScene, tier, hero, media, getProgress, stepDown) {
  const settings = settingsFor(tier);
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  media.appendChild(canvas);

  let scene;
  try {
    scene = createHeroScene(canvas, settings);
  } catch (e) {
    canvas.remove();
    throw e;
  }

  const pointer = { x: 0, y: 0 };
  const aim = { x: 0, y: 0 };
  let dirty = true;
  let raf = 0;
  let visible = true;
  let first = true;
  let warm = 70;
  let lastFrame = 0;
  const samples = [];
  let disposed = false;

  const layout = () => {
    const rect = media.getBoundingClientRect();
    const desktop = !isMobile() && rect.width > rect.height;
    scene.setSize(rect.width, rect.height, { offsetX: desktop ? 0.17 : 0 });
    dirty = true;
    kick();
  };

  const frame = (now) => {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    pointer.x += (aim.x - pointer.x) * 0.08;
    pointer.y += (aim.y - pointer.y) * 0.08;
    const moving = Math.abs(aim.x - pointer.x) > 0.001 || Math.abs(aim.y - pointer.y) > 0.001;
    if (dirty || moving || warm > 0) {
      scene.update(getProgress(), pointer);
      scene.render();
      dirty = false;
      if (first) {
        first = false;
        hero.classList.add('is-ready');
      }
      // Frame timing: only consecutive frames count, and the first ten are shader warm-up.
      if (lastFrame && now - lastFrame < 100 && warm < 60) samples.push(now - lastFrame);
      lastFrame = now;
      if (warm > 0) warm -= 1;
      if (samples.length === 60) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        samples.push(0); // stop measuring
        if (avg > 24 && STEP_DOWN[tier]) {
          stepDown(STEP_DOWN[tier]);
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    } else {
      lastFrame = 0;
    }
  };
  const kick = () => {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  };

  const onPointer = (e) => {
    aim.x = (e.clientX / window.innerWidth) * 2 - 1;
    aim.y = -((e.clientY / window.innerHeight) * 2 - 1);
    kick();
  };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true });

  const ro = new ResizeObserver(layout);
  ro.observe(media);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      dirty = true;
      kick();
    }
  });
  io.observe(hero);
  const onVisibility = () => {
    if (!document.hidden) {
      dirty = true;
      kick();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stepDown('stills');
  });

  layout();

  return {
    update() {
      dirty = true;
      kick();
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      scene.dispose();
      canvas.remove();
    },
  };
}

/**
 * Development only: renders the poster and stage stills and returns them as data URLs.
 * Used by `npm run stills`, which saves them under public/images/hero.
 */
export async function renderStills() {
  const { createHeroScene } = await import('./hero-scene.js');
  const canvas = document.createElement('canvas');
  const scene = createHeroScene(canvas, { pixelRatio: 1, shadows: true, shadowSize: 2048, density: 1 });
  const out = {};
  const shots = [
    ['stage-1', 0.12],
    ['stage-2', 0.5],
    ['stage-3', 1.0],
  ];
  for (const [name, p] of shots) {
    out[`${name}.webp`] = scene.still(p, 1600, 1000, { offsetX: 0.17 }, 'image/webp', 0.8);
    out[`${name}-m.webp`] = scene.still(p, 780, 930, { offsetX: 0 }, 'image/webp', 0.8);
  }
  out['og.png'] = scene.still(1.0, 1200, 630, { offsetX: 0 }, 'image/png');
  scene.dispose();
  return out;
}
