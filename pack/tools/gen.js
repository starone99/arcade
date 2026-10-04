// Packing generator: carve the box into polycubes, then check that a bottom-up drop order exists.
const { normalize, shapeKey, TURNS, keyC, makeBox, landing, solvedBox } = require('./logic.js');
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

function carve(spec, r) {
  const [W, H, D] = spec.size;
  const cats = [];
  for (let k = 0; k < (spec.cats || 0); k++) {
    const opts = []; for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (!cats.some(c => c[0] === x && c[1] === z)) opts.push([x, z]);
    cats.push(opts[Math.floor(r() * opts.length)]);
  }
  const owner = new Map();
  for (const [x, z] of cats) for (let y = 0; y < H; y++) owner.set(keyC([x, y, z]), -1);
  const inb = ([x, y, z]) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
  const empty = () => { const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (!owner.has(keyC([x, y, z]))) out.push([x, y, z]); return out; };
  const pieces = [];
  for (let guard = 0; guard < 200; guard++) {
    const e = empty();
    if (!e.length) break;
    const lowY = Math.min(...e.map(c => c[1]));
    const low = e.filter(c => c[1] === lowY);
    const seed = low[Math.floor(r() * low.length)];
    const size = spec.piece[0] + Math.floor(r() * (spec.piece[1] - spec.piece[0] + 1));
    const cells = [seed]; owner.set(keyC(seed), pieces.length);
    while (cells.length < size) {
      const front = [];
      for (const c of cells) for (const d of N6) { const n = [c[0] + d[0], c[1] + d[1], c[2] + d[2]]; if (inb(n) && !owner.has(keyC(n))) front.push(n); }
      if (!front.length) break;
      // prefer staying low and flat so the drop order works out more often
      front.sort((a, b) => a[1] - b[1]);
      const pick = r() < 0.6 ? front.filter(f => f[1] === front[0][1]) : front;
      const n = pick[Math.floor(r() * pick.length)];
      cells.push(n); owner.set(keyC(n), pieces.length);
    }
    pieces.push(cells);
  }
  // fold single cubes into a neighbour
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].length > 1) continue;
    const c = pieces[i][0];
    const nb = N6.map(d => owner.get(keyC([c[0] + d[0], c[1] + d[1], c[2] + d[2]]))).filter(v => v !== undefined && v >= 0 && v !== i && pieces[v].length < spec.piece[1] + 1);
    if (!nb.length) return null;
    const j = nb[Math.floor(r() * nb.length)];
    pieces[j].push(c); owner.set(keyC(c), j); pieces[i] = [];
  }
  const live = pieces.filter(p => p.length);
  return { cats, pieces: live };
}

// a bottom-up order where each piece drops straight into its place
function dropOrder(spec, carved, r) {
  const L = { size: spec.size, cats: carved.cats };
  const box = makeBox(L);
  const meta = carved.pieces.map(() => ({}));
  const left = carved.pieces.map((_, i) => i), order = [];
  while (left.length) {
    const ok = left.filter(i => {
      const cells = carved.pieces[i];
      const n = normalize(cells), mx = Math.min(...cells.map(c => c[0])), mz = Math.min(...cells.map(c => c[2]));
      const land = landing(box, n, mx, mz, meta[i], meta);
      if (!land.ok || land.holes) return false;
      const want = new Set(cells.map(keyC));
      return land.cells.every(c => want.has(keyC(c)));
    });
    if (!ok.length) return null;
    const i = ok[Math.floor(r() * ok.length)];
    for (const c of carved.pieces[i]) box.filled.set(keyC(c), i);
    order.push(i); left.splice(left.indexOf(i), 1);
  }
  return solvedBox(box) ? order : null;
}

function makeLevel(spec, seed) {
  for (let s = seed; s < seed + 50000; s++) {
    const r = rng(s);
    const carved = carve(spec, r);
    if (!carved || carved.pieces.length < spec.count[0] || carved.pieces.length > spec.count[1]) continue;
    if (carved.pieces.some(p => p.length < 2)) continue;
    const order = dropOrder(spec, carved, r);
    if (!order) continue;
    const [W, H, D] = spec.size;
    const pieces = carved.pieces.map(cells => ({ cells }));
    const has = new Set(carved.pieces.flat().map(keyC));
    // fragile: nothing above it in the finished box
    if (spec.fragile) {
      const cand = pieces.map((p, i) => i).filter(i => carved.pieces[i].every(([x, y, z]) => { for (let yy = y + 1; yy < H; yy++) { const k = keyC([x, yy, z]); if (!carved.pieces[i].some(c => keyC(c) === k)) return false; } return true; }));
      if (cand.length < spec.fragile) continue;
      for (let k = 0; k < spec.fragile; k++) pieces[cand.splice(Math.floor(r() * cand.length), 1)[0]].fragile = true;
    }
    if (spec.heavy) {
      const cand = pieces.map((p, i) => i).filter(i => !pieces[i].fragile && carved.pieces[i].some(c => c[1] === 0));
      if (cand.length < spec.heavy) continue;
      for (let k = 0; k < spec.heavy; k++) pieces[cand.splice(Math.floor(r() * cand.length), 1)[0]].heavy = true;
    }
    // re-check the order with the flags on (fragile pieces must come after anything below... they are on top already)
    const tray = pieces.map((p, i) => {
      let shape = normalize(p.cells);
      const spins = Math.floor(r() * 6);
      for (let k = 0; k < spins; k++) shape = TURNS[['yaw', 'pitch', 'roll'][Math.floor(r() * 3)]](shape);
      return { cells: p.cells, start: shape, fragile: !!p.fragile, heavy: !!p.heavy };
    });
    return { size: spec.size, cats: carved.cats, pieces: tray, order };
  }
  throw new Error('no level for ' + JSON.stringify(spec));
}

// ten rooms of ten: four that each teach one thing, a room of big boxes, then mixes
const ROOMS = [[], ['fragile'], ['heavy'], ['cats'], [], ['fragile', 'heavy'], ['heavy', 'cats'], ['fragile', 'cats'], ['fragile', 'heavy'], ['fragile', 'heavy', 'cats']];
const LADDER = [[2, 2, 2], [3, 2, 2], [3, 2, 2], [3, 2, 3], [3, 3, 2], [3, 3, 2], [3, 3, 3], [3, 3, 3], [4, 3, 3], [4, 3, 3], [4, 2, 4], [4, 3, 4]];
const levels = [];
const t0 = Date.now();
ROOMS.forEach((feats, ri) => {
  for (let k = 0; k < 10; k++) {
    const tutorial = k === 0 && ri < 4;
    const step = Math.min(LADDER.length - 1, k + (ri === 4 || ri >= 8 ? 2 : ri >= 5 ? 1 : 0));
    const size = tutorial ? (feats.includes('cats') ? [3, 2, 2] : [2, 2, 2]) : LADDER[step];
    const cells = size[0] * size[1] * size[2];
    const has = f => feats.includes(f);
    const catCols = has('cats') ? (tutorial ? 1 : 1 + (k >= 6 ? 1 : 0)) : 0;
    const free = cells - catCols * size[1];
    const spec = {
      size,
      piece: [2, 4 + (cells >= 27 ? 1 : 0)],
      count: tutorial ? [2, 3] : [Math.max(2, Math.floor(free / 5.2)), Math.ceil(free / 3)],
      fragile: has('fragile') ? (tutorial ? 1 : 1 + (k >= 5 ? 1 : 0)) : 0,
      heavy: has('heavy') ? (tutorial ? 1 : 1 + (k >= 5 ? 1 : 0)) : 0,
      cats: catCols,
    };
    const L = makeLevel(spec, (ri + 1) * 100003 + k * 7919);
    levels.push(L);
  }
  const mine = levels.slice(ri * 10);
  console.log('room', ri, feats.join('+') || 'basic', mine.map(L => L.size.join('x') + ':' + L.pieces.length).join(' '), `${((Date.now() - t0) / 1000).toFixed(0)}s`);
});
require('fs').writeFileSync('levels.json', JSON.stringify(levels));
console.log('wrote', levels.length);
