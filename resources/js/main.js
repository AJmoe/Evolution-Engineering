// Site-wide enhancements. Every page works without this file.
import '../css/main.css';

const doc = document.documentElement;
doc.classList.add('js');

/* Header gains a shadow after 8 px of scroll */
const header = document.querySelector('.site-header');
if (header) {
  let ticking = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
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

/* Full-screen mobile menu with focus trap and Escape to close */
const sheet = document.getElementById('menu-sheet');
const openBtn = document.querySelector('[data-menu-open]');
if (sheet && openBtn) {
  const closeBtn = sheet.querySelector('[data-menu-close]');
  const focusables = () =>
    [...sheet.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null);

  const open = () => {
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    sheet.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    closeBtn?.focus();
  };
  const close = () => {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    window.setTimeout(() => {
      if (!sheet.classList.contains('is-open')) sheet.hidden = true;
    }, 260);
    openBtn.focus();
  };

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (mq) => {
    if (mq.matches && sheet.classList.contains('is-open')) close();
  });
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
