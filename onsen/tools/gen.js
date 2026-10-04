// Generates the non-tutorial stages of villages 2-10 (stages 12-20, 22-30, ... 82-90, 91-100).
// Grow a tree per spring, keep tubs at the leaves, pour heights down the tree, then dress it with
// the village's gimmick, decoys and cats. Every stage is checked: solvable from the frozen/covered start,
// not already solved after scrambling, and the gimmick actually matters.
const { parseLevel, settle, scramble, resetState, units, rotatable } = require('./logic.js');
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];
const CH = { 10: '─', 5: '│', 6: '┌', 12: '┐', 3: '└', 9: '┘', 7: '├', 13: '┤', 14: '┬', 11: '┴', 15: '┼' };
const bitsOf = m => [N, E, S, W].filter(b => m & b).length;
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pickInt = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// village 2..10 -> index 1..9
const VILLAGE = [
  null,
  { feature: 'gate',    size: [[5, 5]],         fill: 0.45, tubs: [1, 2], cats: [0, 1], decoys: [1, 2], spill: 0.15, fixed: [0, 1] },
  { feature: 'link',    size: [[5, 5]],         fill: 0.48, tubs: [2, 2], cats: [1, 1], decoys: [2, 3], spill: 0.2,  fixed: [0, 1] },
  { feature: 'leaves',  size: [[5, 6], [6, 5]], fill: 0.5,  tubs: [2, 3], cats: [1, 2], decoys: [2, 3], spill: 0.2,  fixed: [0, 1] },
  { feature: 'ice',     size: [[6, 6]],         fill: 0.5,  tubs: [2, 3], cats: [1, 2], decoys: [2, 3], spill: 0.25, fixed: [1, 1] },
  { feature: 'lift',    size: [[6, 6]],         fill: 0.52, tubs: [3, 3], cats: [1, 2], decoys: [3, 4], spill: 0.25, fixed: [1, 1] },
  { feature: 'springs', size: [[6, 6], [7, 6]], fill: 0.55, tubs: [3, 4], cats: [1, 2], decoys: [3, 4], spill: 0.25, fixed: [1, 2] },
  { feature: 'cloud',   size: [[6, 7], [7, 6]], fill: 0.55, tubs: [3, 4], cats: [2, 2], decoys: [3, 4], spill: 0.3,  fixed: [1, 2] },
  { feature: 'colors',  size: [[7, 6], [7, 7]], fill: 0.55, tubs: [3, 4], cats: [1, 2], decoys: [3, 5], spill: 0.3,  fixed: [1, 2] },
  { feature: 'mix',     size: [[7, 7]],         fill: 0.58, tubs: [4, 5], cats: [2, 3], decoys: [4, 6], spill: 0.3,  fixed: [1, 2] },
];
const MAXH = 3;

function attempt(stage, seed) {
  const vi = Math.floor((stage - 1) / 10), V = VILLAGE[vi];
  const r = rng(seed);
  const [Wd, Ht] = V.size[Math.floor(r() * V.size.length)];
  const step = (stage - 1) % 10;                         // 0..9 inside the village, ramps the gimmick count
  let feats = new Set([V.feature]);
  if (V.feature === 'mix') {
    feats = new Set(shuffle(r, ['gate', 'link', 'leaves', 'ice', 'lift', 'cloud']).slice(0, 2));
    if (r() < 0.35) feats.add('colors');
  }
  const twoSprings = feats.has('springs') || feats.has('colors');
  const id = (x, z) => z * Wd + x, inb = (x, z) => x >= 0 && z >= 0 && x < Wd && z < Ht;
  const X = n => n % Wd, Z = n => Math.floor(n / Wd);
  const kind = new Array(Wd * Ht).fill('.'), mask = new Array(Wd * Ht).fill(0), h = new Array(Wd * Ht).fill(-1);
  const parent = new Map(), owner = new Map();

  // 1. springs at the back of the island
  const springs = [];
  springs.push(id(Math.floor(r() * Wd), Math.floor(r() * 2)));
  if (twoSprings) {
    const opts = [];
    for (let z = 0; z < 2; z++) for (let x = 0; x < Wd; x++) if (Math.abs(x - X(springs[0])) >= 3) opts.push(id(x, z));
    if (!opts.length) return null;
    springs.push(opts[Math.floor(r() * opts.length)]);
  }
  springs.forEach((s, t) => { parent.set(s, -1); owner.set(s, t); });
  // 2. grow one tree per spring, taking turns
  const trees = springs.map(s => [s]), recent = springs.map(s => [s]);
  const target = Math.round(Wd * Ht * V.fill);
  for (let guard = 0; trees.reduce((a, t) => a + t.length, 0) < target && guard < 6000; guard++) {
    const t = guard % trees.length;
    const from = r() < 0.7 && recent[t].length ? recent[t][Math.floor(r() * recent[t].length)] : trees[t][Math.floor(r() * trees[t].length)];
    const opts = DIRS.filter(([dx, dz]) => inb(X(from) + dx, Z(from) + dz) && !parent.has(id(X(from) + dx, Z(from) + dz)));
    if (!opts.length) { recent[t] = recent[t].filter(v => v !== from); continue; }
    const [dx, dz] = opts[Math.floor(r() * opts.length)];
    const n = id(X(from) + dx, Z(from) + dz);
    parent.set(n, from); owner.set(n, t); trees[t].push(n);
    recent[t].push(n); if (recent[t].length > 3) recent[t].shift();
  }
  const children = new Map([...parent.keys()].map(n => [n, []]));
  for (const [n, p] of parent) if (p >= 0) children.get(p).push(n);

  // 3. tubs at leaves (at least one per spring), prune other dead ends
  const tubs = new Set();
  const wantTubs = pickInt(r, V.tubs);
  trees.forEach((tr, t) => {
    const leaves = shuffle(r, tr.filter(n => n !== springs[t] && children.get(n).length === 0));
    const share = t === 0 ? Math.ceil(wantTubs / trees.length) : Math.floor(wantTubs / trees.length) || 1;
    leaves.slice(0, share).forEach(n => tubs.add(n));
  });
  if (trees.some((tr, t) => !tr.some(n => tubs.has(n)))) return null;
  const alive = new Set(parent.keys());
  for (let changed = true; changed;) {
    changed = false;
    for (const n of [...alive]) {
      if (springs.includes(n) || tubs.has(n)) continue;
      if (!children.get(n).some(c => alive.has(c))) { alive.delete(n); changed = true; }
    }
  }
  const kids = n => children.get(n).filter(c => alive.has(c));
  const subtree = n => { const out = [n]; for (let i = 0; i < out.length; i++) out.push(...kids(out[i])); return out; };

  // 4. heights pour down each tree
  for (const s of springs) {
    h[s] = MAXH;
    const order = [s];
    for (let i = 0; i < order.length; i++) for (const c of kids(order[i])) { h[c] = Math.max(0, h[order[i]] - (r() < 0.32 ? 1 : 0)); order.push(c); }
  }
  for (const n of alive) {
    kind[n] = springs.includes(n) ? (owner.get(n) === 1 && feats.has('colors') ? 'Q' : 'S') : tubs.has(n) ? (feats.has('colors') ? (owner.get(n) === 1 ? 'B' : 'A') : 'T') : 'P';
    for (const c of kids(n)) {
      const d = DIRS.find(([dx, dz]) => X(n) + dx === X(c) && Z(n) + dz === Z(c));
      mask[n] |= d[2]; mask[c] |= d[3];
    }
  }
  const treePipes = () => [...alive].filter(n => kind[n] === 'P');
  const nearSpring = n => springs.some(s => Math.abs(X(s) - X(n)) + Math.abs(Z(s) - Z(n)) <= 1);

  // 5. clouds lift a branch one step up
  const cloud = [];
  if (feats.has('cloud')) {
    const want = 1 + (step >= 5 ? 1 : 0);
    for (const n of shuffle(r, treePipes())) {
      if (cloud.length >= want) break;
      if (!kids(n).length || h[n] >= MAXH) continue;
      const lifted = kids(n).flatMap(subtree);
      if (lifted.some(m => h[m] + 1 > MAXH)) continue;
      if (lifted.some(m => cloud.includes(m))) continue;
      for (const m of lifted) h[m] += 1;
      cloud.push(n);
    }
    if (!cloud.length) return null;
  }

  // off-tree terrain follows its neighbours, with the odd hill
  for (let pass = 0; pass < 3; pass++) for (let n = 0; n < Wd * Ht; n++) {
    if (alive.has(n) || h[n] >= 0) continue;
    const nb = DIRS.map(([dx, dz]) => inb(X(n) + dx, Z(n) + dz) ? h[id(X(n) + dx, Z(n) + dz)] : -1).filter(v => v >= 0);
    if (nb.length) h[n] = Math.min(MAXH, Math.round(nb.reduce((p, v) => p + v, 0) / nb.length) + (r() < 0.12 ? 1 : 0));
  }
  for (let n = 0; n < Wd * Ht; n++) if (h[n] < 0) h[n] = 0;

  const reserved = new Set();
  const isFree = n => kind[n] === '.' && !reserved.has(n);
  // a dead-end branch off pipe n (used for the gate's scale and for yuzu); returns the new cell or -1
  function branchOff(n) {
    const d = DIRS.find(([dx, dz]) => inb(X(n) + dx, Z(n) + dz) && isFree(id(X(n) + dx, Z(n) + dz)) && h[id(X(n) + dx, Z(n) + dz)] <= h[n]);
    if (!d) return -1;
    const q = id(X(n) + d[0], Z(n) + d[1]);
    const out = DIRS.find(([dx, dz, b]) => b !== d[3] && (!inb(X(q) + dx, Z(q) + dz) || isFree(id(X(q) + dx, Z(q) + dz))));
    if (!out) return -1;
    mask[n] |= d[2]; kind[q] = 'P'; mask[q] = d[3] | out[2];
    if (inb(X(q) + out[0], Z(q) + out[1])) reserved.add(id(X(q) + out[0], Z(q) + out[1]));
    return q;
  }

  // 6. gate on the way to a tub, scale on a branch that does not pass the gate
  const gate = [], scale = [];
  if (feats.has('gate')) {
    for (const g of shuffle(r, treePipes())) {
      if (bitsOf(mask[g]) !== 2 || nearSpring(g) || cloud.includes(g)) continue;
      const below = new Set(subtree(g));
      if (![...below].some(m => tubs.has(m))) continue;
      let q = -1;
      for (const p of shuffle(r, treePipes())) {
        if (below.has(p) || p === g || bitsOf(mask[p]) !== 2 || cloud.includes(p)) continue;
        q = branchOff(p);
        if (q >= 0) break;
      }
      if (q < 0) continue;
      gate.push(g); scale.push(q);
      break;
    }
    if (!gate.length) return null;
  }
  // spill arms: a corner or straight grows a third arm toward somewhere water cannot go
  for (const n of treePipes()) {
    if (r() >= V.spill || bitsOf(mask[n]) !== 2 || gate.includes(n)) continue;
    const opts = DIRS.filter(([dx, dz, b]) => !(mask[n] & b) && (!inb(X(n) + dx, Z(n) + dz) || isFree(id(X(n) + dx, Z(n) + dz))));
    if (!opts.length) continue;
    const [dx, dz, b] = opts[Math.floor(r() * opts.length)];
    mask[n] |= b;
    if (inb(X(n) + dx, Z(n) + dz)) reserved.add(id(X(n) + dx, Z(n) + dz));
  }
  let yuzu = null;
  if (stage % 3 === 0 && !feats.has('colors')) {
    for (const n of shuffle(r, treePipes())) {
      if (bitsOf(mask[n]) !== 2 || gate.includes(n)) continue;
      const q = branchOff(n);
      if (q >= 0) { yuzu = q; break; }
    }
  }
  // 7. cats beside the pipes, then decoy pipes
  const nearPipe = n => DIRS.some(([dx, dz]) => inb(X(n) + dx, Z(n) + dz) && kind[id(X(n) + dx, Z(n) + dz)] === 'P');
  for (let i = pickInt(r, V.cats); i > 0; i--) {
    const c = [...Array(Wd * Ht).keys()].filter(n => isFree(n) && nearPipe(n));
    if (!c.length) break;
    kind[c[Math.floor(r() * c.length)]] = 'C';
  }
  const shapes = [E | W, E | S, N | E | W, E | S, N | S];
  for (let i = pickInt(r, V.decoys); i > 0; i--) {
    const c = [...Array(Wd * Ht).keys()].filter(isFree);
    if (!c.length) break;
    const n = c[Math.floor(r() * c.length)];
    kind[n] = 'P'; mask[n] = shapes[Math.floor(r() * shapes.length)];
  }
  const special = new Set([...gate, ...scale, ...cloud, yuzu]);
  const plain = () => [...Array(Wd * Ht).keys()].filter(n => kind[n] === 'P' && mask[n] !== 15 && !special.has(n));

  // 8. village gimmicks
  const lift = [], ice = [], leaves = [], links = [];
  if (feats.has('lift')) {
    const want = 1 + (step >= 5 ? 1 : 0);
    for (const n of shuffle(r, plain().filter(n => alive.has(n) && bitsOf(mask[n]) === 2 && !nearSpring(n)))) {
      if (lift.length >= want) break;
      const p = parent.get(n), hi = cloud.includes(p) ? MAXH + 1 : h[p];
      const lo = Math.max(0, ...kids(n).map(c => h[c]));
      const alt = hi + 1 <= MAXH + 1 && r() < 0.6 ? hi + 1 : lo - 1 >= 0 ? lo - 1 : hi + 1 <= MAXH + 1 ? hi + 1 : -1;
      if (alt < 0) continue;
      lift.push([n, alt]); special.add(n);
    }
    if (!lift.length) return null;
  }
  if (feats.has('ice')) {
    const want = 1 + Math.floor(step / 4);
    for (const n of shuffle(r, plain().filter(n => alive.has(n)))) { if (ice.length < want) { ice.push(n); special.add(n); } }
    if (!ice.length) return null;
  }
  if (feats.has('leaves')) {
    const want = 2 + Math.floor(step / 3);
    const onTree = shuffle(r, plain().filter(n => alive.has(n))), off = shuffle(r, plain().filter(n => !alive.has(n)));
    for (const n of [...onTree.slice(0, Math.max(1, want - 1)), ...off.slice(0, 1)]) if (leaves.length < want) { leaves.push(n); special.add(n); }
    if (!leaves.some(n => alive.has(n))) return null;
  }
  if (feats.has('link')) {
    const want = 1 + Math.floor(step / 4);
    const pool = shuffle(r, plain());
    for (const a of pool) {
      if (links.length >= want) break;
      if (special.has(a)) continue;
      const b = pool.find(m => m !== a && !special.has(m) && Math.abs(X(m) - X(a)) + Math.abs(Z(m) - Z(a)) <= 3 && (alive.has(a) || alive.has(m)));
      if (b === undefined) continue;
      links.push([a, b]); special.add(a); special.add(b);
    }
    if (!links.length) return null;
  }
  // 9. a few stone pipes already set correctly
  const stones = shuffle(r, plain().filter(n => alive.has(n) && !special.has(n))).slice(0, pickInt(r, V.fixed));

  const tiles = [], heights = [];
  for (let z = 0; z < Ht; z++) {
    let t = '', hh = '';
    for (let x = 0; x < Wd; x++) { const n = id(x, z); t += kind[n] === 'P' ? CH[mask[n]] : kind[n]; hh += h[n]; }
    tiles.push(t); heights.push(hh);
  }
  const xy = n => [X(n), Z(n)];
  const L = { tiles, heights };
  if (stones.length) L.fixed = stones.map(xy);
  if (yuzu !== null) L.yuzu = [xy(yuzu)];
  if (gate.length) { L.gate = gate.map(xy); L.scale = scale.map(xy); }
  if (cloud.length) L.cloud = cloud.map(xy);
  if (lift.length) L.lift = lift.map(([n, alt]) => [...xy(n), alt]);
  if (ice.length) L.ice = ice.map(xy);
  if (leaves.length) L.leaves = leaves.map(xy);
  if (links.length) L.links = links.map(p => p.map(xy));
  return L;
}

function validate(L, stage) {
  let lv;
  try { lv = parseLevel({ name: `stage ${stage}`, ...L }); } catch (e) { return 'parse: ' + e.message; }
  const solvedFromStart = () => { resetState(lv); for (const c of lv.cells) c.leafOn = false; return settle(lv).f; };
  const f = solvedFromStart();
  if (!f.solved) return 'unsolved';
  if (L.yuzu && f.yuzu.length !== 1) return 'yuzu unreachable';
  if (lv.cells.some(c => c.kind === 'tub' && lv.srcs.some(s => Math.abs(c.x - s.x) + Math.abs(c.z - s.z) === 1))) return 'tub beside spring';
  // each gimmick must matter
  if (L.gate) { const sc = lv.cells.filter(c => c.scale); sc.forEach(c => { c.scale = false; }); const g = solvedFromStart(); sc.forEach(c => { c.scale = true; }); if (g.solved) return 'gate does not matter'; }
  for (const c of lv.cells.filter(c => c.lift)) { resetState(lv); for (const d of lv.cells) d.leafOn = false; c.h = c.hAlt; if (settle(lv).f.solved) return 'lift does not matter'; }
  if (units(lv).length < 3 + Math.floor(stage / 12)) return 'too few tiles';
  let par;
  try { par = scramble(lv, stage - 1); } catch (e) { return 'scramble'; }
  return { par, units: units(lv).length, tubs: f.tubs.length, size: `${lv.W}x${lv.H}` };
}

const stages = [];
for (let stage = 12; stage <= 100; stage++) {
  if (stage % 10 === 1 && stage <= 81) continue;            // tutorials are handmade
  let got = null, tries = 0;
  for (let seed = stage * 1000; !got; seed++) {
    if (++tries > 20000) throw new Error('stage ' + stage + ' could not be generated');
    const L = attempt(stage, seed);
    if (!L) continue;
    const v = validate(L, stage);
    if (typeof v === 'string') continue;
    got = { L, v };
  }
  stages.push({ stage, ...got.L });
  if (stage % 10 === 2 || stage % 10 === 0) console.log(stage, got.v.size, `tubs=${got.v.tubs} units=${got.v.units} par=${got.v.par} tries=${tries}`);
}
require('fs').writeFileSync('generated.json', JSON.stringify(stages));
console.log('wrote', stages.length, 'stages,', JSON.stringify(stages).length, 'bytes');
