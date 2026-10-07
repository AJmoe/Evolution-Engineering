// Chooses a quality tier from device signals, then from measured frame times.
// Tiers: 'high', 'medium', 'stills'. See the 3D spec in the developer brief.

export const TIERS = {
  high: { pixelRatio: 2, shadowSize: 2048, shadows: true, density: 1 },
  medium: { pixelRatio: 1.5, shadowSize: 1024, shadows: true, density: 0.5 },
};

export function isMobile() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Initial tier from signals alone. */
export function initialTier() {
  const nav = navigator;
  if (nav.connection && nav.connection.saveData) return 'stills';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return 'stills';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return 'stills';
  if (!hasWebGL()) return 'stills';
  return isMobile() ? 'medium' : 'high';
}

/** Settings for a tier, with mobile limits applied (pixel ratio 1.5, no shadows). */
export function settingsFor(tier) {
  const base = { ...(TIERS[tier] || TIERS.medium) };
  if (isMobile()) {
    base.pixelRatio = Math.min(base.pixelRatio, 1.5);
    base.shadows = false;
    base.density = 0.5;
  }
  base.pixelRatio = Math.min(base.pixelRatio, window.devicePixelRatio || 1);
  return base;
}

/**
 * Measures the first 60 rendered frames. If the average exceeds 24 ms,
 * calls onStepDown once. Call tick() after every render.
 */
export function frameMonitor(onStepDown, frames = 60, budgetMs = 24) {
  let count = 0;
  let start = 0;
  let done = false;
  return {
    tick() {
      if (done) return;
      const now = performance.now();
      if (count === 0) start = now;
      count += 1;
      if (count > frames) {
        done = true;
        const avg = (now - start) / (count - 1);
        if (avg > budgetMs) onStepDown(avg);
      }
    },
    reset() {
      count = 0;
      done = false;
    },
  };
}
