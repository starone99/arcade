// Split each model into parts, then check that an assembly order exists under the workbench's rules.
const { keyC, N6, normalize, TURNS, canSlideIn, touchesSupport } = require('./logic.js');
const { FAMILIES, FAMILY_ORDER } = require('./models.js');
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// shift the model so its minimum corner is at the origin
function shiftModel(cells) { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])), mz = Math.min(...cells.map(c => c[2])); return cells.map(([x, y, z, c]) => [x - mx, y - my, z - mz, c]); }

function split(cells, target, r) {
  const at = new Map(cells.map(c => [keyC(c), c]));
  const owner = new Map(), parts = [];
  const sizeFor = () => target[0] + Math.floor(r() * (target[1] - target[0] + 1));
  const order = cells.slice().sort((a, b) => a[1] - b[1] || r() - 0.5);
  for (const seed of order) {
    if (owner.has(keyC(seed))) continue;
    const part = [seed]; owner.set(keyC(seed), parts.length);
    const size = sizeFor();
    while (part.length < size) {
      const front = [];
      for (const c of part) for (const [dx, dy, dz] of N6) { const k = keyC([c[0] + dx, c[1] + dy, c[2] + dz]); if (at.has(k) && !owner.has(k)) front.push(at.get(k)); }
      if (!front.length) break;
      const n = front[Math.floor(r() * front.length)];
      part.push(n); owner.set(keyC(n), parts.length);
    }
    parts.push(part);
  }
  // fold single cubes into a neighbour part
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length !== 1) continue;
    const c = parts[i][0];
    const nb = N6.map(([dx, dy, dz]) => owner.get(keyC([c[0] + dx, c[1] + dy, c[2] + dz]))).filter(v => v !== undefined && v !== i && parts[v].length);
    if (!nb.length) return null;
    const j = nb[Math.floor(r() * nb.length)];
    parts[j].push(c); owner.set(keyC(c), j); parts[i] = [];
  }
  return parts.filter(p => p.length);
}

function assemblyOrder(parts, rules, bounds, r) {
  const filled = new Set(), left = parts.map((_, i) => i), order = [];
  while (left.length) {
    const ok = left.filter(i => (!rules.support || touchesSupport(parts[i], filled)) && (!rules.slide || canSlideIn(parts[i], filled, bounds)));
    if (!ok.length) return null;
    // prefer lower parts so the order reads naturally (bottom up)
    ok.sort((a, b) => Math.min(...parts[a].map(c => c[1])) - Math.min(...parts[b].map(c => c[1])));
    const i = r() < 0.75 ? ok[0] : ok[Math.floor(r() * ok.length)];
    for (const c of parts[i]) filled.add(keyC(c));
    order.push(i); left.splice(left.indexOf(i), 1);
  }
  return order;
}
// with the rules on, is the stage too forgiving? (count orders that fail without care)
function orderMatters(parts, rules, bounds) {
  if (!rules.slide && !rules.support) return true;
  // placing parts top-down should fail somewhere if the rules bite
  const filled = new Set();
  const byTop = parts.map((_, i) => i).sort((a, b) => Math.max(...parts[b].map(c => c[1])) - Math.max(...parts[a].map(c => c[1])));
  for (const i of byTop) {
    if ((rules.support && !touchesSupport(parts[i], filled)) || (rules.slide && !canSlideIn(parts[i], filled, bounds))) return true;
    for (const c of parts[i]) filled.add(keyC(c));
  }
  return false;
}

const BENCHES = [
  { name: 'first',  turn: 'none', colour: true,  support: false, slide: false, parts: [3, 4],   big: false },
  { name: 'yaw',    turn: 'yaw',  colour: true,  support: false, slide: false, parts: [3, 5],   big: false },
  { name: 'any',    turn: 'any',  colour: true,  support: false, slide: false, parts: [4, 5],   big: false },
  { name: 'support',turn: 'any',  colour: true,  support: true,  slide: false, parts: [4, 6],   big: false },
  { name: 'plain',  turn: 'any',  colour: false, support: true,  slide: false, parts: [4, 6],   big: false },
  { name: 'slide',  turn: 'any',  colour: true,  support: true,  slide: true,  parts: [5, 7],   big: true },
  { name: 'big',    turn: 'any',  colour: true,  support: true,  slide: true,  parts: [6, 9],   big: true },
  { name: 'plainbig', turn: 'any', colour: false, support: true, slide: true,  parts: [6, 9],   big: true },
  { name: 'fine',   turn: 'any',  colour: true,  support: true,  slide: true,  parts: [8, 12],  big: true },
  { name: 'master', turn: 'any',  colour: false, support: true,  slide: true,  parts: [9, 14],  big: true },
];
const stages = [];
BENCHES.forEach((B, bi) => {
  for (let k = 0; k < 10; k++) {
    let famIdx = (bi * 7 + k * 3) % FAMILY_ORDER.length, tries = 0;
    let got = null;
    for (let s = (bi + 1) * 100003 + k * 7919; !got; s++) {
      // some models can't meet a bench's rules at that size; move on to the next model
      if (++tries % 4000 === 0) famIdx = (famIdx + 1) % FAMILY_ORDER.length;
      if (tries > 4000 * FAMILY_ORDER.length) throw new Error(`bench ${bi} stage ${k}: nothing fits`);
      const fam = FAMILY_ORDER[famIdx];
      const r = rng(s);
      const big = B.big || (k >= 6 && bi >= 2);
      const m = FAMILIES[fam](r, big);
      const cells = shiftModel(m.cells);
      const n = cells.length;
      const sz = bi === 0 && k === 0 ? [n / 3, n / 2] : [Math.max(2, Math.floor(n / B.parts[1])), Math.max(3, Math.ceil(n / B.parts[0]))];
      const parts = split(cells, [Math.round(sz[0]), Math.round(sz[1])], r);
      if (!parts) continue;
      const want = bi === 0 && k === 0 ? [2, 3] : B.parts;
      if (parts.length < want[0] || parts.length > want[1] + 1) continue;
      const bounds = [0, Math.max(...cells.map(c => c[1])), 0, Math.max(...cells.map(c => c[0])), Math.max(...cells.map(c => c[2]))];
      const rules = { support: B.support, slide: B.slide };
      const order = assemblyOrder(parts, rules, bounds, r);
      if (!order) continue;
      if (k === 0 && (B.support || B.slide) && !orderMatters(parts, rules, bounds)) continue;
      // trays start turned (or not, on the first bench)
      const start = parts.map(p => {
        let sh = normalize(p);
        if (B.turn === 'yaw') { const t = 1 + Math.floor(r() * 3); for (let i = 0; i < t; i++) sh = TURNS.yaw(sh); }
        if (B.turn === 'any') { for (let i = 0, t = 2 + Math.floor(r() * 5); i < t; i++) sh = TURNS[['yaw', 'pitch', 'roll'][Math.floor(r() * 3)]](sh); }
        return sh;
      });
      got = { name: m.name, colour: B.colour, rules, turn: B.turn, parts: parts.map((p, i) => ({ cells: p, start: start[i] })), order };
    }
    stages.push(got);
  }
  console.log('bench', bi, B.name, stages.slice(bi * 10).map(s => `${s.name}:${s.parts.length}`).join(' '));
});
require('fs').writeFileSync('stages.json', JSON.stringify(stages));
console.log('wrote', stages.length, JSON.stringify(stages).length, 'bytes');
