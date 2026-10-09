// Site-wide enhancements. Every page works without this file.
import '../css/main.css';
import '../css/theme.css';

const doc = document.documentElement;
doc.classList.add('js');

/* Homepage hero film. Loaded only on the homepage; Three.js loads later, when idle. */
const hero = document.querySelector('[data-hero]');
if (hero) {
  import('./hero.js').then(({ initHero, renderStills }) => {
    const renderMode = doc.dataset.env === 'local' && new URLSearchParams(window.location.search).has('render-stills');
    if (renderMode) {
      window.__eeStills = renderStills();
      return;
    }
    initHero(hero);
  });
}

/* Small-homes 3D viewers: loaded when a viewer nears the screen, never on low-end devices. */
const viewerFrames = document.querySelectorAll('[data-home-viewer]');
if (viewerFrames.length) {
  const start = (frame) =>
    import('./homes-viewer.js')
      .then(({ createHomesViewer }) => {
        const viewer = createHomesViewer(frame, {
          models: JSON.parse(frame.dataset.models || '{}'),
          initial: frame.dataset.initial,
        });
        const toggle = frame.querySelector('[data-mood-toggle]');
        if (toggle) {
          toggle.hidden = false;
          const buttons = toggle.querySelectorAll('[data-mood]');
          buttons.forEach((b) =>
            b.addEventListener('click', () => {
              viewer.setMood(b.dataset.mood);
              buttons.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
            }),
          );
        }
        frame.closest('[data-homes-viewer]')?.addEventListener('design-change', (e) => viewer.show(e.detail.slug));
      })
      .catch(() => {
        /* The poster stays in place; every fact is also in the page text. */
      });

  import('./quality.js').then(({ initialTier }) => {
    if (initialTier() === 'stills') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          start(entry.target);
        }
      },
      { rootMargin: '200px' },
    );
    viewerFrames.forEach((f) => io.observe(f));
  });
}

/* Header becomes a fixed navy bar once the hero has scrolled away; the back-to-top button appears with it */
const header = document.querySelector('.bx-header');
const toTop = document.querySelector('[data-to-top]');
if (header) {
  let ticking = false;
  const update = () => {
    const past = window.scrollY > 220;
    header.classList.toggle('is-sticky', past);
    toTop?.classList.toggle('is-on', window.scrollY > 600);
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/* Mobile menu: a details element. Close it on outside tap, Escape, link tap, or when the desktop nav appears. */
const mMenu = document.querySelector('[data-m-menu]');
if (mMenu) {
  const close = () => mMenu.removeAttribute('open');
  document.addEventListener('click', (e) => {
    if (mMenu.open && !mMenu.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mMenu.open) {
      close();
      mMenu.querySelector('summary')?.focus();
    }
  });
  mMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  window.matchMedia('(min-width: 1200px)').addEventListener('change', (mq) => mq.matches && close());
}

/* Project filters: links work without JavaScript; with it, filtering is instant. */
const projectGrid = document.querySelector('[data-project-grid]');
if (projectGrid) {
  const chips = document.querySelectorAll('[data-filter]');
  const count = document.querySelector('[data-results-count]');
  const cards = [...projectGrid.querySelectorAll('[data-category]')];
  const empty = document.querySelector('[data-empty]');

  const apply = (type, year, push) => {
    let shown = 0;
    for (const card of cards) {
      const match = (!type || card.dataset.category === type) && (!year || card.dataset.year === year);
      card.hidden = !match;
      if (match) shown += 1;
    }
    chips.forEach((chip) => {
      const [kind, value] = chip.dataset.filter.split(':');
      const active = kind === 'type' ? value === (type || '') : value === (year || '');
      chip.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (count) count.textContent = `${shown} ${shown === 1 ? 'project' : 'projects'}`;
    if (empty) empty.hidden = shown !== 0;
    if (push) {
      const url = new URL(window.location.href);
      type ? url.searchParams.set('type', type) : url.searchParams.delete('type');
      year ? url.searchParams.set('year', year) : url.searchParams.delete('year');
      history.replaceState(null, '', url);
    }
  };

  const state = () => {
    const params = new URL(window.location.href).searchParams;
    return { type: params.get('type') || '', year: params.get('year') || '' };
  };

  chips.forEach((chip) =>
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const s = state();
      const [kind, value] = chip.dataset.filter.split(':');
      if (kind === 'type') s.type = value;
      else s.year = value;
      apply(s.type, s.year, true);
    }),
  );

  const s = state();
  apply(s.type, s.year, false);
}

/* Contact form: live character count for project details */
const message = document.getElementById('message');
const counter = document.querySelector('[data-char-count]');
if (message && counter) {
  const max = Number(message.getAttribute('maxlength')) || 2000;
  const update = () => {
    counter.textContent = `${message.value.length} of ${max} characters`;
  };
  message.addEventListener('input', update);
  update();
}

/* Homes: design tabs switch the info panel in place (links still work without JS) */
const homesViewer = document.querySelector('[data-homes-viewer]');
if (homesViewer) {
  const tabs = homesViewer.querySelectorAll('[data-design-tab]');
  const panels = homesViewer.querySelectorAll('[data-design-panel]');
  const posters = homesViewer.querySelectorAll('[data-design-poster]');
  const select = (slug, focus) => {
    tabs.forEach((t) => {
      const on = t.dataset.designTab === slug;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('aria-current', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach((p) => (p.hidden = p.dataset.designPanel !== slug));
    posters.forEach((p) => (p.hidden = p.dataset.designPoster !== slug));
    homesViewer.dispatchEvent(new CustomEvent('design-change', { detail: { slug } }));
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      select(tab.dataset.designTab, false);
      const url = new URL(window.location.href);
      url.searchParams.set('design', tab.dataset.designTab);
      history.replaceState(null, '', url);
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.designTab, true);
    });
  });
}

toTop?.addEventListener('click', () => {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  document.getElementById('main')?.focus({ preventScroll: true });
});

/* Overlays: the search screen and the information sidebar. Escape or the close button dismisses them. */
const overlay = (panel, openers, onOpen) => {
  if (!panel) return;
  let lastOpener = null;
  const isSidebar = panel.classList.contains('bx-sidebar');
  const open = (opener) => {
    lastOpener = opener;
    panel.hidden = false;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    document.addEventListener('keydown', onKey);
    // Focus once the panel is visible; a visibility:hidden element cannot take focus.
    requestAnimationFrame(() => onOpen?.());
  };
  const close = () => {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    document.removeEventListener('keydown', onKey);
    window.setTimeout(
      () => {
        if (!panel.classList.contains('is-open')) panel.hidden = true;
      },
      isSidebar ? 450 : 0,
    );
    lastOpener?.focus();
  };
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  openers.forEach((b) => b.addEventListener('click', () => open(b)));
  panel.querySelectorAll('[data-overlay-close]').forEach((b) => b.addEventListener('click', close));
};
const search = document.querySelector('[data-search]');
overlay(search, document.querySelectorAll('[data-search-open]'), () => search.querySelector('input')?.focus());
const sidebar = document.querySelector('[data-sidebar]');
overlay(sidebar, document.querySelectorAll('[data-sidebar-open]'), () => sidebar.querySelector('.bx-close')?.focus());

/* Sliders: native scroll-snap lists; the arrow buttons scroll one card at a time. */
document.querySelectorAll('[data-slider]').forEach((slider) => {
  const track = slider.querySelector('.slider__track');
  const prev = slider.querySelector('[data-prev]');
  const next = slider.querySelector('[data-next]');
  if (!track || !prev || !next) return;
  const step = () => {
    const item = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
  };
  const sync = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
    slider.querySelector('.slider__nav').hidden = max <= 0;
  };
  const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: smooth }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: smooth }));
  track.addEventListener('scroll', () => requestAnimationFrame(sync), {
    passive: true,
  });
  window.addEventListener('resize', sync);
  sync();
});

/* Fade-up reveals, progress bars and counters start when they scroll into view. */
const counters = document.querySelectorAll('[data-count]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const countUp = (el) => {
  const to = Number(el.dataset.count);
  if (reduce || !to) {
    el.textContent = String(to);
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / 1600);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const watched = document.querySelectorAll('[data-reveal], .bar, [data-count]');
if ('IntersectionObserver' in window && watched.length) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        entry.target.classList.add('is-in');
        if (entry.target.dataset.count) countUp(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  if (!reduce) counters.forEach((el) => (el.textContent = '0'));
  watched.forEach((el) => io.observe(el));
} else {
  watched.forEach((el) => el.classList.add('is-in'));
  counters.forEach((el) => (el.textContent = el.dataset.count));
}

/* Progress bars take their value from data-to (inline styles are blocked by the CSP; CSSOM is not). */
document.querySelectorAll('.bar[data-to]').forEach((bar) => {
  bar.querySelector('.bar__fill')?.style.setProperty('--to', `${Number(bar.dataset.to)}%`);
});
