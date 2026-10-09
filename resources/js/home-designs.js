// Concept small-home designs, in plan metres: x runs left to right, y runs from the back wall (0)
// to the front (positive y faces the street). One spec drives three things, so they always agree:
//   - the 3D viewer (resources/js/homes-viewer.js)
//   - the floor plan and blueprint SVGs (tools/home-drawings.mjs -> public/images/homes/)
// TODO-CLIENT: concept layouts only. Replace with the designer's drawings when they are ready.
//
// outline   the exterior wall line, as a closed polygon
// wings     footprint rectangles with a roof: 'gable-x' (ridge along x), 'gable-y' or 'flat'
// openings  exterior doors and windows: a wall segment (x1,y1)-(x2,y2) and the side it faces
// walls     interior walls as segments (plan only)
// doors     interior doors: hinge (x1,y1) to latch (x2,y2), opening towards 'swing'
// rooms     labels with the rectangle used for the area
// furniture plan symbols: [type, x, y, w, d, rotation?]

export const WALL_H = 2.8;
export const PLINTH = 0.35;

export const DESIGNS = {
  gable: {
    size: [7, 6],
    roofRise: 1.9,
    outline: [
      [0, 0],
      [7, 0],
      [7, 6],
      [0, 6],
    ],
    wings: [{ x: 0, y: 0, w: 7, d: 6, roof: 'gable-x' }],
    openings: [
      { type: 'door', x1: 2.6, y1: 6, x2: 3.5, y2: 6, out: 's' },
      { type: 'window', x1: 0.7, y1: 6, x2: 2.2, y2: 6, out: 's' },
      { type: 'window', x1: 5.1, y1: 6, x2: 6.1, y2: 6, out: 's', h: 0.7, sill: 1.5 },
      { type: 'window', x1: 7, y1: 0.9, x2: 7, y2: 2.3, out: 'e' },
      { type: 'window', x1: 1.1, y1: 0, x2: 2.7, y2: 0, out: 'n' },
      { type: 'window', x1: 5, y1: 0, x2: 6.2, y2: 0, out: 'n' },
      { type: 'window', x1: 0, y1: 3.5, x2: 0, y2: 4.9, out: 'w' },
    ],
    walls: [
      [4, 0, 4, 6],
      [4, 3.4, 7, 3.4],
    ],
    doors: [
      { x1: 4, y1: 3.15, x2: 4, y2: 2.35, swing: 'e' },
      { x1: 4, y1: 5.15, x2: 4, y2: 4.4, swing: 'e' },
    ],
    rooms: [
      { name: 'Living & kitchen', rect: [0, 0, 4, 6], at: [2, 3.1] },
      { name: 'Bedroom', rect: [4, 0, 3, 3.4], at: [5.25, 2.75] },
      { name: 'Bathroom', rect: [4, 3.4, 3, 2.6], at: [5.75, 4.35] },
    ],
    furniture: [
      ['counter', 0.12, 0.12, 3.76, 0.6],
      ['sink', 1.4, 0.15, 0.8, 0.5],
      ['stove', 2.7, 0.15, 0.6, 0.55],
      ['table4', 1.4, 1.6, 1.2, 0.8],
      ['sofa', 0.15, 3.6, 0.85, 1.9, 90],
      ['coffee', 1.4, 4.1, 0.6, 0.9],
      ['bed2', 4.75, 0.15, 1.5, 2.0],
      ['wardrobe', 6.35, 2.35, 0.55, 0.95],
      ['shower', 6.0, 5.0, 0.9, 0.9],
      ['wc', 4.3, 3.55, 0.4, 0.65],
      ['basin', 5.0, 3.5, 0.55, 0.42],
    ],
    veranda: { rect: [0, 6, 7, 2.2], posts: [0.15, 3.5, 6.85] },
    tank: { x: 8.3, y: 4.6, r: 0.75 },
  },

  lshape: {
    size: [11.6, 9],
    roofRise: 1.6,
    outline: [
      [0, 0],
      [11.6, 0],
      [11.6, 9],
      [7, 9],
      [7, 5],
      [0, 5],
    ],
    wings: [
      { x: 0, y: 0, w: 7, d: 5, roof: 'gable-x' },
      { x: 7, y: 0, w: 4.6, d: 9, roof: 'gable-y' },
    ],
    openings: [
      { type: 'door', x1: 4.6, y1: 5, x2: 5.5, y2: 5, out: 's' },
      { type: 'window', x1: 0.9, y1: 5, x2: 3.3, y2: 5, out: 's' },
      { type: 'window', x1: 1.2, y1: 0, x2: 2.6, y2: 0, out: 'n' },
      { type: 'window', x1: 4.6, y1: 0, x2: 5.8, y2: 0, out: 'n' },
      { type: 'window', x1: 0, y1: 1.6, x2: 0, y2: 3.2, out: 'w' },
      { type: 'window', x1: 8.9, y1: 0, x2: 10.3, y2: 0, out: 'n' },
      { type: 'window', x1: 11.6, y1: 1.2, x2: 11.6, y2: 2.6, out: 'e' },
      { type: 'window', x1: 11.6, y1: 4.25, x2: 11.6, y2: 4.95, out: 'e', h: 0.6, sill: 1.6 },
      { type: 'window', x1: 11.6, y1: 6.4, x2: 11.6, y2: 7.8, out: 'e' },
      { type: 'window', x1: 8.8, y1: 9, x2: 10.6, y2: 9, out: 's' },
      { type: 'window', x1: 7, y1: 6.5, x2: 7, y2: 7.6, out: 'w' },
    ],
    walls: [
      [7, 0, 7, 1.4],
      [7, 2.4, 7, 5],
      [8.2, 0, 8.2, 9],
      [8.2, 3.8, 11.6, 3.8],
      [8.2, 5.4, 11.6, 5.4],
    ],
    doors: [
      { x1: 8.2, y1: 3.45, x2: 8.2, y2: 2.65, swing: 'e' },
      { x1: 8.2, y1: 5.2, x2: 8.2, y2: 4.45, swing: 'e' },
      { x1: 8.2, y1: 5.65, x2: 8.2, y2: 6.45, swing: 'e' },
    ],
    rooms: [
      { name: 'Living & dining', rect: [0, 0, 7, 5], at: [5.1, 3.3] },
      { name: 'Bedroom 1', rect: [8.2, 0, 3.4, 3.8], at: [9.9, 3.2] },
      { name: 'Bathroom', rect: [8.2, 3.8, 3.4, 1.6], at: [10.7, 5.15], small: true },
      { name: 'Bedroom 2', rect: [8.2, 5.4, 3.4, 3.6], at: [10.2, 8.2] },
      { name: 'Passage', rect: [7, 0, 1.2, 9], at: [7.6, 8.4], small: true },
    ],
    furniture: [
      ['counter', 0.12, 0.12, 3.6, 0.6],
      ['sink', 1.5, 0.15, 0.8, 0.5],
      ['stove', 2.8, 0.15, 0.6, 0.55],
      ['island', 1.0, 1.5, 1.8, 0.7],
      ['table6', 4.3, 0.9, 1.8, 0.9],
      ['sofa', 0.6, 3.25, 2.4, 0.85],
      ['coffee', 1.3, 2.4, 1.0, 0.55],
      ['bed2', 9.3, 0.15, 1.6, 2.0],
      ['wardrobe', 10.9, 2.5, 0.6, 1.2, 90],
      ['bath', 9.9, 3.9, 1.6, 0.7],
      ['wc', 9.15, 4.68, 0.4, 0.65],
      ['basin', 8.35, 3.95, 0.55, 0.42],
      ['bed2', 9.35, 5.5, 1.5, 2.0],
      ['wardrobe', 8.35, 8.3, 1.1, 0.6],
    ],
    veranda: { rect: [0, 5, 7, 2], posts: [0.15, 3.5, 6.85] },
  },

  courtyard: {
    size: [12, 10.2],
    roofRise: 0,
    outline: [
      [0, 0],
      [12, 0],
      [12, 10.2],
      [7.8, 10.2],
      [7.8, 4.2],
      [4.2, 4.2],
      [4.2, 10.2],
      [0, 10.2],
    ],
    wings: [
      { x: 0, y: 0, w: 12, d: 4.2, roof: 'flat' },
      { x: 0, y: 4.2, w: 4.2, d: 6, roof: 'flat' },
      { x: 7.8, y: 4.2, w: 4.2, d: 6, roof: 'flat' },
    ],
    openings: [
      { type: 'slider', x1: 4.7, y1: 4.2, x2: 7.3, y2: 4.2, out: 's' },
      { type: 'slider', x1: 4.2, y1: 5.0, x2: 4.2, y2: 9.4, out: 'e' },
      { type: 'slider', x1: 7.8, y1: 5.0, x2: 7.8, y2: 9.4, out: 'w' },
      { type: 'window', x1: 0.8, y1: 10.2, x2: 2.4, y2: 10.2, out: 's' },
      { type: 'window', x1: 10.0, y1: 10.2, x2: 11.0, y2: 10.2, out: 's', h: 0.7, sill: 1.5 },
      { type: 'window', x1: 1.0, y1: 0, x2: 2.6, y2: 0, out: 'n' },
      { type: 'window', x1: 5.4, y1: 0, x2: 8.0, y2: 0, out: 'n' },
      { type: 'window', x1: 10.2, y1: 0, x2: 11.0, y2: 0, out: 'n', h: 0.7, sill: 1.5 },
      { type: 'window', x1: 0, y1: 5.0, x2: 0, y2: 6.4, out: 'w' },
      { type: 'window', x1: 0, y1: 7.8, x2: 0, y2: 9.0, out: 'w' },
      { type: 'window', x1: 12, y1: 5.2, x2: 12, y2: 6.8, out: 'e' },
      { type: 'door', x1: 12, y1: 2.9, x2: 12, y2: 3.75, out: 'e' },
    ],
    walls: [
      [4.2, 0, 4.2, 1.2],
      [4.2, 3.0, 4.2, 4.2],
      [9.2, 0, 9.2, 4.2],
      [9.2, 2.4, 12, 2.4],
      [3.1, 4.2, 3.1, 10.2],
      [0, 7.3, 3.1, 7.3],
      [8.9, 4.2, 8.9, 10.2],
      [8.9, 7.9, 12, 7.9],
      [0, 4.2, 3.1, 4.2],
      [8.9, 4.2, 12, 4.2],
    ],
    doors: [
      { x1: 9.2, y1: 1.65, x2: 9.2, y2: 0.85, swing: 'e' },
      { x1: 9.2, y1: 3.75, x2: 9.2, y2: 2.95, swing: 'e' },
      { x1: 3.1, y1: 6.05, x2: 3.1, y2: 5.25, swing: 'w' },
      { x1: 3.1, y1: 9.05, x2: 3.1, y2: 8.25, swing: 'w' },
      { x1: 8.9, y1: 5.25, x2: 8.9, y2: 6.05, swing: 'e' },
      { x1: 10.6, y1: 7.9, x2: 11.4, y2: 7.9, swing: 's' },
    ],
    rooms: [
      { name: 'Kitchen & dining', rect: [0, 0, 4.2, 4.2], at: [2.1, 3.7] },
      { name: 'Living', rect: [4.2, 0, 5, 4.2], at: [6.7, 3.3] },
      { name: 'Bathroom', rect: [9.2, 0, 2.8, 2.4], at: [10.45, 1.55] },
      { name: 'Laundry', rect: [9.2, 2.4, 2.8, 1.8], at: [10.9, 3.4], small: true },
      { name: 'Bedroom 2', rect: [0, 4.2, 3.1, 3.1], at: [1.85, 6.85] },
      { name: 'Bedroom 3', rect: [0, 7.3, 3.1, 2.9], at: [1.85, 9.3] },
      { name: 'Main bedroom', rect: [8.9, 4.2, 3.1, 3.7], at: [10.45, 7.15] },
      { name: 'En-suite', rect: [8.9, 7.9, 3.1, 2.3], at: [9.85, 8.6] },
      { name: 'Courtyard', rect: [4.2, 4.2, 3.6, 6], at: [6.0, 7.6], outdoor: true },
    ],
    furniture: [
      ['counter', 0.12, 0.12, 3.9, 0.6],
      ['sink', 1.4, 0.15, 0.8, 0.5],
      ['stove', 2.8, 0.15, 0.6, 0.55],
      ['table4', 1.4, 1.7, 1.2, 0.8],
      ['sofa', 5.0, 0.4, 2.6, 0.9],
      ['coffee', 5.8, 1.6, 1.0, 0.55],
      ['bath', 10.3, 0.12, 1.6, 0.7],
      ['wc', 9.35, 0.15, 0.4, 0.65],
      ['basin', 11.35, 1.3, 0.55, 0.42, 90],
      ['bed1', 0.15, 4.45, 1.0, 2.0],
      ['wardrobe', 2.45, 4.35, 0.55, 0.85],
      ['bed1', 0.15, 7.5, 1.0, 2.0],
      ['bed2', 10.25, 4.35, 1.6, 2.0],
      ['wardrobe', 9.0, 4.3, 1.1, 0.55],
      ['shower', 11.0, 9.2, 0.9, 0.9],
      ['wc', 9.1, 9.4, 0.4, 0.65],
      ['basin', 9.7, 9.65, 0.55, 0.42],
      ['tree', 6.25, 5.1, 1.3, 1.3],
    ],
    pergola: { rect: [4.2, 8.6, 3.6, 1.6] },
    carport: { rect: [12.3, 4.6, 3.2, 5.6] },
  },
};

/** Gross floor area of the wings, in square metres. */
export function grossArea(design) {
  return design.wings.reduce((sum, w) => sum + w.w * w.d, 0);
}
