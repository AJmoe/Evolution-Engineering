// Cross-fades the three pre-rendered stage stills with scroll when 3D is not used.
// No Three.js is downloaded on this path.

const FADES = [
  null,
  [0.26, 0.4], // Blueprint to Build
  [0.62, 0.76], // Build to Handover
];

export function createStills(media) {
  const wrap = document.createElement('div');
  wrap.className = 'hero__stills';
  wrap.setAttribute('aria-hidden', 'true');
  const imgs = [1, 2, 3].map((n) => {
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.media = '(max-width: 899px)';
    source.srcset = `/images/hero/stage-${n}-m.webp`;
    const img = document.createElement('img');
    img.src = `/images/hero/stage-${n}.webp`;
    img.alt = '';
    img.decoding = 'async';
    img.width = 1600;
    img.height = 1000;
    picture.append(source, img);
    wrap.appendChild(picture);
    return picture;
  });
  media.appendChild(wrap);

  return {
    update(p) {
      imgs.forEach((pic, i) => {
        if (!FADES[i]) return;
        const [a, b] = FADES[i];
        pic.style.opacity = String(Math.min(1, Math.max(0, (p - a) / (b - a))));
      });
    },
    dispose() {
      wrap.remove();
    },
  };
}
