// Reads a sticky scroll track and reports smoothed 0..1 progress, firing only on change.
// The page scrolls natively; this only observes it.

export function scrollProgress(track, onChange, { lerp = 0.09, immediate = false } = {}) {
  let target = 0;
  let current = 0;
  let raf = 0;
  let last = -1;

  const measure = () => {
    const rect = track.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    target = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
  };

  const loop = () => {
    raf = 0;
    const diff = target - current;
    current = immediate || Math.abs(diff) < 0.0005 ? target : current + diff * lerp;
    if (current !== last) {
      last = current;
      onChange(current, target);
    }
    if (current !== target) raf = requestAnimationFrame(loop);
  };

  const kick = () => {
    measure();
    if (!raf) raf = requestAnimationFrame(loop);
  };

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  kick();

  return {
    get value() {
      return current;
    },
    /** Scroll the page so the track sits at progress p. */
    scrollTo(p) {
      const rect = track.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const span = rect.height - window.innerHeight;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: top + span * p + 1, behavior: reduce ? 'auto' : 'smooth' });
    },
    refresh: kick,
    destroy() {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
