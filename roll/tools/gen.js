// Board generator: let the block wander (painting the cells it touches), end standing up -> goal,
// add a few side tiles, then apply the garden's gimmick. Every board is solved by BFS; par = optimal moves.
const { parseBoard, solve, reachableCount, occupied } = require('./logic.js');
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ROLL = (s, d) => {
  const { x, z, o } = s;
  if (o === 'u') return { E: { x: x + 1, z, o: 'x' }, W: { x: x - 2, z, o: 'x' }, S: { x, z: z + 1, o: 'z' }, N: { x, z: z - 2, o: 'z' } }[d];
  if (o === 'x') return { E: { x: x + 2, z, o: 'u' }, W: { x: x - 1, z, o: 'u' }, S: { x, z: z + 1, o: 'x' }, N: { x, z: z - 1, o: 'x' } }[d];
  return { S: { x, z: z + 2, o: 'u' }, N: { x, z: z - 1, o: 'u' }, E: { x: x + 1, z, o: 'z' }, W: { x: x - 1, z, o: 'z' } }[d];
};

function makeBoard({ W, H, walk, extra, feature, featureCount }, r) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const inb = s => occupied(s).every(([x, z]) => x >= 0 && z >= 0 && x < W && z < H);
  let s = { x: 1 + Math.floor(r() * (W - 2)), z: 1 + Math.floor(r() * (H - 2)), o: 'u' };
  const start = { ...s };
  const visits = [];                                  // states along the wander
  const paint = st => occupied(st).forEach(([x, z]) => { g[z][x] = 'o'; });
  paint(s); visits.push(s);
  let last = null;
  for (let i = 0; i < walk || s.o !== 'u' || (Math.abs(s.x - start.x) + Math.abs(s.z - start.z) < 3); i++) {
    if (i > walk + 30) return null;
    const ds = ['N', 'E', 'S', 'W'].filter(d => inb(ROLL(s, d)));
    // prefer not to undo the last roll
    const back = { N: 'S', S: 'N', E: 'W', W: 'E' }[last];
    const pick = ds.filter(d => d !== back);
    if (!ds.length) return null;
    const list = pick.length && r() < 0.85 ? pick : ds;
    const d = list[Math.floor(r() * list.length)];
    s = ROLL(s, d); last = d; paint(s); visits.push(s);
  }
  const goal = s;
  for (let k = 0; k < extra; k++) {
    const opts = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (g[z][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => g[z + dz] && g[z + dz][x + dx] === 'o')) opts.push([x, z]);
    if (!opts.length) break;
    const [x, z] = opts[Math.floor(r() * opts.length)]; g[z][x] = 'o';
  }
  g[start.z][start.x] = 'S'; g[goal.z][goal.x] = 'G';
  const plainCells = () => { const out = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (g[z][x] === 'o') out.push([x, z]); return out; };
  const pick = list => list.splice(Math.floor(r() * list.length), 1)[0];
  if (feature === 'yuzu') {
    // yuzu only where the wander went, so the board stays solvable
    const on = new Set(visits.flatMap(occupied).map(([x, z]) => `${x},${z}`));
    const cand = plainCells().filter(([x, z]) => on.has(`${x},${z}`));
    for (let k = 0; k < featureCount && cand.length; k++) { const [x, z] = pick(cand); g[z][x] = 'y'; }
  }
  if (feature === 'lily') { const cand = plainCells(); for (let k = 0; k < featureCount && cand.length; k++) { const [x, z] = pick(cand); g[z][x] = 'l'; } }
  if (feature === 'ice') { const cand = plainCells(); for (let k = 0; k < featureCount && cand.length; k++) { const [x, z] = pick(cand); g[z][x] = 'i'; } }
  if (feature === 'bridge') {
    // a closed bridge across a stretch the wander used, a button somewhere else
    const used = visits.slice(2, -2).filter(st => st.o !== 'u').map(occupied).filter(cs => cs.every(([x, z]) => g[z][x] === 'o'));
    if (!used.length) return null;
    const cs = used[Math.floor(r() * used.length)];
    cs.forEach(([x, z]) => { g[z][x] = '='; });
    const cand = plainCells().filter(([x, z]) => !cs.some(([bx, bz]) => Math.abs(bx - x) + Math.abs(bz - z) <= 1));
    if (!cand.length) return null;
    const [bx, bz] = pick(cand); g[bz][bx] = r() < 0.3 ? 'B' : 'b';
  }
  return g.map(row => row.join(''));
}

// does the gimmick change the answer? (compare with the gimmick tiles turned into plain stone)
function matters(board, feature, par) {
  const plain = board.map(row => row.replace(feature === 'lily' ? /l/g : feature === 'ice' ? /i/g : feature === 'bridge' ? /=/g : /y/g, feature === 'bridge' ? '+' : 'o'));
  if (feature === 'yuzu') return true;
  const s = solve(parseBoard({ name: 'p', board: plain }));
  if (feature === 'bridge') return !s || s.length !== par || true;
  return !s || s.length !== par;
}

function find(spec, seed0, accept) {
  for (let seed = seed0; seed < seed0 + 400000; seed++) {
    const r = rng(seed);
    const board = makeBoard(spec, r);
    if (!board) continue;
    const b = parseBoard({ name: 'g', board });
    const sol = solve(b);
    if (!sol) continue;
    if (spec.feature && !matters(board, spec.feature, sol.length)) continue;
    const states = reachableCount(b);
    if (!accept(sol.length, states)) continue;
    return { board, par: sol.length, states };
  }
  throw new Error('nothing found for ' + JSON.stringify(spec));
}
module.exports = { find };

if (require.main === module) {
  const GARDENS = [
    { feature: null,     size: [[7, 5], [8, 6], [9, 6], [10, 7]] },
    { feature: 'yuzu',   size: [[7, 5], [8, 6], [9, 6], [10, 7]] },
    { feature: 'lily',   size: [[7, 5], [8, 6], [9, 6], [10, 7]] },
    { feature: 'bridge', size: [[7, 5], [8, 6], [9, 6], [10, 7]] },
    { feature: 'ice',    size: [[7, 5], [8, 6], [9, 6], [10, 7]] },
  ];
  // tutorials: tiny, gentle boards where the gimmick matters
  const tut = GARDENS.map((G, gi) => find({ W: 6, H: 4, walk: 6, extra: 2, feature: G.feature, featureCount: G.feature === 'yuzu' ? 1 : G.feature === 'lily' ? 3 : G.feature === 'ice' ? 4 : 0 }, 900 + gi * 100000,
    (par, st) => par >= 4 && par <= 7 && st <= 60));
  const stages = [];
  GARDENS.forEach((G, gi) => {
    stages.push({ garden: gi, tutorial: true, ...tut[gi] });
    for (let k = 1; k < 8; k++) {
      const [W, H] = G.size[Math.min(3, Math.floor((k - 1) / 2))];
      const lo = 5 + k * 2 + (G.feature === 'ice' ? 0 : Math.min(gi, 2)), hi = lo + 10;
      const found = find({ W, H, walk: 10 + k * 3 + gi * 2, extra: 3 + k, feature: G.feature, featureCount: G.feature === 'yuzu' ? 1 + Math.floor(k / 3) : G.feature === 'lily' ? 3 + k : G.feature === 'ice' ? 3 + Math.ceil(k / 2) : 0 },
        (gi + 1) * 1000003 + k * 7919, (par, st) => par >= lo && par <= hi && st >= 25);
      stages.push({ garden: gi, ...found });
    }
  });
  for (const gi of [0, 1, 2, 3, 4]) {
    const list = stages.filter(s => s.garden === gi && !s.tutorial).sort((a, b) => a.par - b.par);
    console.log('garden', gi, 'tutorial par', stages.find(s => s.garden === gi && s.tutorial).par, '| pars', list.map(s => s.par).join(' '));
  }
  const ordered = [];
  for (const gi of [0, 1, 2, 3, 4]) ordered.push(stages.find(s => s.garden === gi && s.tutorial), ...stages.filter(s => s.garden === gi && !s.tutorial).sort((a, b) => a.par - b.par));
  require('fs').writeFileSync('stages.json', JSON.stringify(ordered.map(({ board, par }) => ({ board, par }))));
  console.log('wrote', ordered.length);
  ordered.slice(0, 1).concat(ordered.filter((_, i) => i % 8 === 0)).forEach(s => console.log(s.board.join('\n'), '\n'));
}
