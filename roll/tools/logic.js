// LOGIC START
// Board chars: . void   o stone   S start (block stands here)   G onsen hole   y stone with a yuzu
// l lily pad (can't stand upright on it)   b button (any touch)   B flower button (upright only)
// = bridge, closed at start   + bridge, open at start   i ice (a block resting fully on ice slides on)
const DIRV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const DIR_KEYS = ['N', 'E', 'S', 'W'];

function parseBoard(L) {
  const H = L.board.length, W = L.board[0].length;
  const cells = [];
  let start = null, goal = null;
  for (let z = 0; z < H; z++) {
    if (L.board[z].length !== W) throw new Error(`${L.name}: row ${z} width mismatch`);
    for (let x = 0; x < W; x++) {
      const ch = L.board[z][x];
      if (!'.oSGylbB=+i'.includes(ch)) throw new Error(`${L.name}: unknown tile ${ch}`);
      cells.push(ch);
      if (ch === 'S') start = [x, z];
      if (ch === 'G') goal = [x, z];
    }
  }
  if (!start || !goal) throw new Error(`${L.name}: needs S and G`);
  const at = (x, z) => (x >= 0 && z >= 0 && x < W && z < H ? cells[z * W + x] : '.');
  const yuzu = [];
  cells.forEach((c, n) => { if (c === 'y') yuzu.push([n % W, Math.floor(n / W)]); });
  const bridgesOpenAtStart = cells.includes('+');
  return { name: L.name, W, H, cells, at, start, goal, yuzu, hasBridges: cells.some(c => c === '=' || c === '+'), bridgesOpenAtStart };
}

// o: 'u' upright, 'x' lying along x (covers x, x+1), 'z' lying along z (covers z, z+1)
const occupied = s => s.o === 'u' ? [[s.x, s.z]] : s.o === 'x' ? [[s.x, s.z], [s.x + 1, s.z]] : [[s.x, s.z], [s.x, s.z + 1]];
function rolled(s, d) {
  const { x, z, o } = s;
  if (o === 'u') return { E: { x: x + 1, z, o: 'x' }, W: { x: x - 2, z, o: 'x' }, S: { x, z: z + 1, o: 'z' }, N: { x, z: z - 2, o: 'z' } }[d];
  if (o === 'x') return { E: { x: x + 2, z, o: 'u' }, W: { x: x - 1, z, o: 'u' }, S: { x, z: z + 1, o: 'x' }, N: { x, z: z - 1, o: 'x' } }[d];
  return { S: { x, z: z + 2, o: 'u' }, N: { x, z: z - 1, o: 'u' }, E: { x: x + 1, z, o: 'z' }, W: { x: x - 1, z, o: 'z' } }[d];
}
const slid = (s, d) => ({ x: s.x + DIRV[d][0], z: s.z + DIRV[d][1], o: s.o });

// '=' bridges start closed, '+' start open; one flag flips them all
const isBridgeOpen = (c, flipped) => (c === '+' ? !flipped : flipped);
// can the block rest here? null if fine, else the reason
function blockedBy(b, s, flip) {
  for (const [x, z] of occupied(s)) {
    const c = b.at(x, z);
    if (c === '.') return 'edge';
    if ((c === '=' || c === '+') && !isBridgeOpen(c, flip)) return 'bridge';
    if (c === 'l' && s.o === 'u') return 'lily';
  }
  return null;
}

// one player move: roll, then press buttons, pick up yuzu, slide on ice. Returns the new game state or a reason.
function step(b, g, d) {
  let s = rolled(g.s, d);
  const why = blockedBy(b, s, g.flip);
  if (why) return { blocked: why };
  const path = [{ s, kind: 'roll' }];
  let flip = g.flip, got = g.got, pressed = [];
  const land = st => {
    for (const [x, z] of occupied(st)) {
      const c = b.at(x, z);
      if (c === 'b' || (c === 'B' && st.o === 'u')) pressed.push([x, z]);
      const yi = b.yuzu.findIndex(([yx, yz]) => yx === x && yz === z);
      if (yi >= 0 && !(got & (1 << yi))) got |= 1 << yi;
    }
  };
  land(s);
  // slide while resting fully on ice
  for (let guard = 0; guard < 40 && occupied(s).every(([x, z]) => b.at(x, z) === 'i'); guard++) {
    const n = slid(s, d);
    if (blockedBy(b, n, flip)) break;
    s = n; path.push({ s, kind: 'slide' }); land(s);
  }
  if (pressed.length % 2 === 1) {
    // a button flips every bridge, unless that would pull the floor out from under the block
    if (!blockedBy(b, s, !flip)) flip = !flip;
  }
  const allYuzu = got === (1 << b.yuzu.length) - 1;
  const won = s.o === 'u' && s.x === b.goal[0] && s.z === b.goal[1] && allYuzu;
  return { g: { s, flip, got }, path, pressed: pressed.length > 0, flipped: flip !== g.flip, newYuzu: got !== g.got, won };
}
const startState = b => ({ s: { x: b.start[0], z: b.start[1], o: 'u' }, flip: false, got: 0 });
const keyOf = g => `${g.s.x},${g.s.z},${g.s.o},${g.flip ? 1 : 0},${g.got}`;

// shortest solution from game state g (BFS); returns the list of directions, or null
function solve(b, g = startState(b), limit = 200000) {
  const prev = new Map([[keyOf(g), null]]), q = [g];
  for (let i = 0; i < q.length && i < limit; i++) {
    const cur = q[i];
    for (const d of DIR_KEYS) {
      const r = step(b, cur, d);
      if (r.blocked) continue;
      const k = keyOf(r.g);
      if (prev.has(k)) continue;
      prev.set(k, [keyOf(cur), d, cur]);
      if (r.won) {
        const moves = [];
        for (let kk = k; prev.get(kk); kk = prev.get(kk)[0]) moves.unshift(prev.get(kk)[1]);
        return moves;
      }
      q.push(r.g);
    }
  }
  return null;
}
function reachableCount(b) {
  const seen = new Set([keyOf(startState(b))]), q = [startState(b)];
  for (let i = 0; i < q.length; i++) for (const d of DIR_KEYS) { const r = step(b, q[i], d); if (r.blocked) continue; const k = keyOf(r.g); if (!seen.has(k)) { seen.add(k); q.push(r.g); } }
  return seen.size;
}
// LOGIC END
module.exports = { parseBoard, step, solve, startState, occupied, reachableCount, DIR_KEYS, DIRV };
