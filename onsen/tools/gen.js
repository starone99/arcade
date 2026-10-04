// Generates stages 11-100: grow a spanning tree from the spring, prune to tubs at the leaves,
// pour heights down the tree, then add decoys, cats, spill arms, stones and yuzu. Every stage is verified.
const { LEVELS, parseLevel, flow, scramble, rotatable } = require('./logic.js');
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];
const CH = { 10: '─', 5: '│', 6: '┌', 12: '┐', 3: '└', 9: '┘', 7: '├', 13: '┤', 14: '┬', 11: '┴', 15: '┼' };
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// per chapter (stages 11-20 = chapter 1 ... 91-100 = chapter 9)
const CHAPTER = [
  null,
  { size: [[4, 4], [4, 5], [5, 4], [5, 5]], fill: 0.45, tubs: [1, 2], cats: [0, 1], decoys: [1, 2], spill: 0.15, fixed: [0, 1], maxH: 3 },
  { size: [[5, 5]],                         fill: 0.48, tubs: [2, 2], cats: [1, 1], decoys: [2, 3], spill: 0.2,  fixed: [0, 1], maxH: 3 },
  { size: [[5, 6], [6, 5]],                 fill: 0.5,  tubs: [2, 3], cats: [1, 2], decoys: [2, 3], spill: 0.25, fixed: [1, 1], maxH: 3 },
  { size: [[6, 6]],                         fill: 0.5,  tubs: [3, 3], cats: [1, 2], decoys: [3, 4], spill: 0.25, fixed: [1, 2], maxH: 3 },
  { size: [[6, 6]],                         fill: 0.55, tubs: [3, 4], cats: [2, 2], decoys: [3, 4], spill: 0.3,  fixed: [1, 2], maxH: 3 },
  { size: [[6, 7], [7, 6]],                 fill: 0.55, tubs: [3, 4], cats: [2, 2], decoys: [4, 5], spill: 0.3,  fixed: [1, 2], maxH: 3 },
  { size: [[7, 7]],                         fill: 0.55, tubs: [4, 4], cats: [2, 3], decoys: [4, 5], spill: 0.3,  fixed: [2, 2], maxH: 3 },
  { size: [[7, 7]],                         fill: 0.58, tubs: [4, 5], cats: [3, 3], decoys: [5, 6], spill: 0.35, fixed: [2, 3], maxH: 3 },
  { size: [[7, 7]],                         fill: 0.6,  tubs: [5, 5], cats: [3, 3], decoys: [6, 7], spill: 0.35, fixed: [2, 3], maxH: 3 },
];
const pickInt = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

function attempt(stage, seed) {
  const ch = CHAPTER[Math.floor((stage - 1) / 10)];
  const r = rng(seed);
  const [Wd, Ht] = ch.size[Math.floor(r() * ch.size.length)];
  const id = (x, z) => z * Wd + x;
  const inb = (x, z) => x >= 0 && z >= 0 && x < Wd && z < Ht;
  const kind = new Array(Wd * Ht).fill('.'), mask = new Array(Wd * Ht).fill(0), h = new Array(Wd * Ht).fill(-1);
  const parent = new Map(), children = new Map();

  // 1. spring near the top-back of the island
  const sx = Math.floor(r() * Wd), sz = Math.floor(r() * Math.min(2, Ht));
  const src = id(sx, sz);
  const tree = [src]; parent.set(src, -1);
  const target = Math.round(Wd * Ht * ch.fill);
  let recent = [src];
  for (let guard = 0; tree.length < target && guard < 4000; guard++) {
    const from = r() < 0.7 && recent.length ? recent[Math.floor(r() * recent.length)] : tree[Math.floor(r() * tree.length)];
    const fx = from % Wd, fz = Math.floor(from / Wd);
    const opts = DIRS.filter(([dx, dz]) => inb(fx + dx, fz + dz) && !parent.has(id(fx + dx, fz + dz)));
    if (!opts.length) { recent = recent.filter(v => v !== from); continue; }
    const [dx, dz] = opts[Math.floor(r() * opts.length)];
    const n = id(fx + dx, fz + dz);
    parent.set(n, from); tree.push(n);
    recent.push(n); if (recent.length > 3) recent.shift();
  }
  for (const n of tree) children.set(n, []);
  for (const n of tree) if (parent.get(n) >= 0) children.get(parent.get(n)).push(n);

  // 2. tubs at some leaves; prune every other dead end
  const leaves = tree.filter(n => n !== src && children.get(n).length === 0);
  const tubCount = Math.min(leaves.length, pickInt(r, ch.tubs));
  if (tubCount < ch.tubs[0]) return null;
  const tubs = new Set(shuffle(r, leaves.slice()).slice(0, tubCount));
  let alive = new Set(tree);
  for (let changed = true; changed;) {
    changed = false;
    for (const n of [...alive]) {
      if (n === src || tubs.has(n)) continue;
      if (children.get(n).filter(c => alive.has(c)).length === 0) { alive.delete(n); changed = true; }
    }
  }
  // 3. heights pour down the tree
  const order = [src];
  h[src] = ch.maxH;
  for (let i = 0; i < order.length; i++) {
    const n = order[i];
    for (const c of children.get(n)) {
      if (!alive.has(c)) continue;
      h[c] = Math.max(0, h[n] - (r() < 0.32 ? 1 : 0));
      order.push(c);
    }
  }
  for (const n of alive) {
    const x = n % Wd, z = Math.floor(n / Wd);
    kind[n] = n === src ? 'S' : tubs.has(n) ? 'T' : 'P';
    for (const c of children.get(n)) if (alive.has(c)) {
      const cx = c % Wd, cz = Math.floor(c / Wd);
      const d = DIRS.find(([dx, dz]) => x + dx === cx && z + dz === cz);
      mask[n] |= d[2]; mask[c] |= d[3];
    }
  }
  // off-tree terrain follows its neighbours, with the odd hill
  for (let pass = 0; pass < 3; pass++) for (let n = 0; n < Wd * Ht; n++) {
    if (h[n] >= 0 && alive.has(n)) continue;
    const x = n % Wd, z = Math.floor(n / Wd);
    const nb = DIRS.map(([dx, dz]) => inb(x + dx, z + dz) ? h[id(x + dx, z + dz)] : -1).filter(v => v >= 0);
    if (!nb.length) continue;
    if (h[n] < 0) h[n] = Math.min(ch.maxH, Math.round(nb.reduce((p, v) => p + v, 0) / nb.length) + (r() < 0.12 ? 1 : 0));
  }
  for (let n = 0; n < Wd * Ht; n++) if (h[n] < 0) h[n] = 0;

  const free = () => [...Array(Wd * Ht).keys()].filter(n => kind[n] === '.');
  const reserved = new Set();
  // 4. spill arms: a corner or straight grows a third arm toward somewhere water cannot go
  for (const n of alive) {
    if (kind[n] !== 'P' || r() >= ch.spill) continue;
    const bits = [N, E, S, W].filter(b => mask[n] & b).length;
    if (bits !== 2) continue;
    const x = n % Wd, z = Math.floor(n / Wd);
    const opts = DIRS.filter(([dx, dz, b]) => {
      if (mask[n] & b) return false;
      if (!inb(x + dx, z + dz)) return true;
      const m = id(x + dx, z + dz);
      return kind[m] === '.' && !reserved.has(m) && (h[m] > h[n] || true);
    });
    if (!opts.length) continue;
    const [dx, dz, b] = opts[Math.floor(r() * opts.length)];
    mask[n] |= b;
    if (inb(x + dx, z + dz)) reserved.add(id(x + dx, z + dz));
  }
  // 5. yuzu branch: a dead-end pipe hanging off a straight/corner
  let yuzu = null;
  if (stage % 3 === 0) {
    for (const n of shuffle(r, [...alive])) {
      if (kind[n] !== 'P' || [N, E, S, W].filter(b => mask[n] & b).length !== 2) continue;
      const x = n % Wd, z = Math.floor(n / Wd);
      const d = DIRS.find(([dx, dz]) => inb(x + dx, z + dz) && kind[id(x + dx, z + dz)] === '.' && !reserved.has(id(x + dx, z + dz)) && h[id(x + dx, z + dz)] <= h[n]);
      if (!d) continue;
      const q = id(x + d[0], z + d[1]), qx = x + d[0], qz = z + d[1];
      const out = DIRS.find(([dx, dz, b]) => b !== d[3] && (!inb(qx + dx, qz + dz) || (kind[id(qx + dx, qz + dz)] === '.' && !reserved.has(id(qx + dx, qz + dz)))));
      if (!out) continue;
      mask[n] |= d[2]; kind[q] = 'P'; mask[q] = d[3] | out[2];
      if (inb(qx + out[0], qz + out[1])) reserved.add(id(qx + out[0], qz + out[1]));
      yuzu = [qx, qz];
      break;
    }
  }
  // 6. cats beside the pipes (where a wrong turn would soak them), then decoy pipes
  const nearPipe = n => { const x = n % Wd, z = Math.floor(n / Wd); return DIRS.some(([dx, dz]) => inb(x + dx, z + dz) && kind[id(x + dx, z + dz)] === 'P'); };
  const cats = pickInt(r, ch.cats);
  for (let i = 0; i < cats; i++) {
    const c = free().filter(n => !reserved.has(n) && nearPipe(n));
    if (!c.length) break;
    kind[c[Math.floor(r() * c.length)]] = 'C';
  }
  const decoys = pickInt(r, ch.decoys);
  const shapes = [E | W, E | S, N | E | W, E | S, N | S];
  for (let i = 0; i < decoys; i++) {
    const c = free().filter(n => !reserved.has(n));
    if (!c.length) break;
    const n = c[Math.floor(r() * c.length)];
    kind[n] = 'P'; mask[n] = shapes[Math.floor(r() * shapes.length)];
  }
  // 7. a few stone pipes that are already set correctly
  const stones = [];
  const pipeTree = [...alive].filter(n => kind[n] === 'P' && mask[n] !== 15);
  for (const n of shuffle(r, pipeTree).slice(0, pickInt(r, ch.fixed))) stones.push([n % Wd, Math.floor(n / Wd)]);

  const tiles = [], heights = [];
  for (let z = 0; z < Ht; z++) {
    let t = '', hh = '';
    for (let x = 0; x < Wd; x++) {
      const n = id(x, z);
      t += kind[n] === 'P' ? CH[mask[n]] : kind[n];
      hh += h[n];
    }
    tiles.push(t); heights.push(hh);
  }
  const L = { tiles, heights };
  if (stones.length) L.fixed = stones;
  if (yuzu) L.yuzu = [yuzu];
  return L;
}

function validate(L, stage) {
  const lv = parseLevel({ name: 'x', tip: '', ...L });
  for (const c of lv.cells) c.mask = c.sol;
  const f = flow(lv);
  if (!f.solved) return 'unsolved';
  if (L.yuzu && f.yuzu.length !== 1) return 'yuzu unreachable';
  const rot = lv.cells.filter(rotatable).length;
  const minRot = 3 + Math.floor(stage / 8);
  if (rot < minRot) return 'too few tiles';
  // reject stages that every scramble already solves (e.g. a tub right next to the spring)
  const { rotCW } = require('./logic.js');
  let ok = false;
  for (let t = 0; t < 40 && !ok; t++) {
    const r2 = rng(stage * 77 + t);
    for (const c of lv.cells) if (rotatable(c)) { c.mask = c.sol; const k = Math.floor(r2() * 4); for (let i = 0; i < k; i++) c.mask = rotCW(c.mask); }
    ok = !flow(lv).solved;
  }
  if (!ok) return 'trivial';
  if (lv.cells.some(c => c.kind === 'tub' && Math.abs(c.x - lv.src.x) + Math.abs(c.z - lv.src.z) === 1)) return 'tub beside spring';
  const par = scramble(lv, stage - 1);
  return { par, rot, tubs: f.tubs.length, cats: lv.cells.filter(c => c.kind === 'cat').length, size: `${lv.W}x${lv.H}` };
}

const out = [];
for (let stage = 11; stage <= 100; stage++) {
  let got = null, tries = 0;
  for (let seed = stage * 1000; !got; seed++) {
    if (tries > 5000) throw new Error('stage ' + stage + ' could not be generated');
    tries++;
    const L = attempt(stage, seed);
    if (!L) continue;
    const v = validate(L, stage);
    if (typeof v === 'string') continue;
    got = { L, v };
  }
  out.push(got.L);
  if (stage % 10 === 1 || stage % 10 === 0) console.log(stage, got.v.size, `tubs=${got.v.tubs} cats=${got.v.cats} rot=${got.v.rot} par=${got.v.par} tries=${tries}`);
}
require('fs').writeFileSync('generated.json', JSON.stringify(out));
console.log('wrote', out.length, 'stages,', JSON.stringify(out).length, 'bytes');
