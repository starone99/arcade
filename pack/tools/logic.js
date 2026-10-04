// LOGIC START
// Cubes are [x, y, z] with y up. A piece is a list of cubes; orientations are normalised (min corner at 0).
const keyC = ([x, y, z]) => `${x},${y},${z}`;
function normalize(cs) {
  const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])), mz = Math.min(...cs.map(c => c[2]));
  return cs.map(([x, y, z]) => [x - mx, y - my, z - mz]).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
}
const shapeKey = cs => normalize(cs).map(keyC).join(';');
const yaw = cs => normalize(cs.map(([x, y, z]) => [-z, y, x]));     // turn around the vertical axis
const pitch = cs => normalize(cs.map(([x, y, z]) => [x, -z, y]));   // tip forward
const roll = cs => normalize(cs.map(([x, y, z]) => [-y, x, z]));    // tip sideways
const TURNS = { yaw, pitch, roll };
// shortest button sequence that turns `from` into `to` (or null if they are different shapes)
function turnsBetween(from, to) {
  const goal = shapeKey(to), start = normalize(from);
  const prev = new Map([[shapeKey(start), null]]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const k = shapeKey(q[i]);
    if (k === goal) { const seq = []; for (let kk = k; prev.get(kk); kk = prev.get(kk)[0]) seq.unshift(prev.get(kk)[1]); return seq; }
    for (const [name, f] of Object.entries(TURNS)) { const n = f(q[i]), nk = shapeKey(n); if (!prev.has(nk)) { prev.set(nk, [k, name]); q.push(n); } }
  }
  return null;
}

// box state: filled[key] = piece id (or 'cat'); fragile/heavy flags live on pieces
function makeBox(L) {
  const [W, H, D] = L.size;
  const filled = new Map();
  for (const [x, z] of L.cats || []) for (let y = 0; y < H; y++) filled.set(keyC([x, y, z]), 'cat');
  return { W, H, D, filled, cells: W * H * D };
}
const heightAt = (box, x, z) => { let h = 0; for (let y = 0; y < box.H; y++) if (box.filled.has(keyC([x, y, z]))) h = y + 1; return h; };

// where would this piece land if dropped with its footprint corner at (ax, az)? null if it can't go there
function landing(box, cubes, ax, az, piece, pieces) {
  let Y = 0;
  for (const [cx, cy, cz] of cubes) {
    const x = ax + cx, z = az + cz;
    if (x < 0 || z < 0 || x >= box.W || z >= box.D) return { ok: false, why: 'out' };
    Y = Math.max(Y, heightAt(box, x, z) - cy);
  }
  const cells = cubes.map(([cx, cy, cz]) => [ax + cx, Y + cy, az + cz]);
  if (cells.some(c => c[1] >= box.H)) return { ok: false, why: 'tall', cells };
  if (piece.heavy && Y !== 0) return { ok: false, why: 'heavy', cells };
  // nothing may rest above a fragile piece
  for (const [x, y, z] of cells) for (let yy = 0; yy < y; yy++) {
    const id = box.filled.get(keyC([x, yy, z]));
    if (id !== undefined && id !== 'cat' && pieces[id].fragile) return { ok: false, why: 'fragile', cells };
  }
  // empty cells trapped underneath
  const own = new Set(cells.map(keyC));
  let holes = 0;
  for (const [x, y, z] of cells) for (let yy = 0; yy < y; yy++) { const k = keyC([x, yy, z]); if (!box.filled.has(k) && !own.has(k)) holes++; }
  return { ok: true, Y, cells, holes };
}
function solvedBox(box) { return box.filled.size === box.cells; }
// LOGIC END
module.exports = { normalize, shapeKey, yaw, pitch, roll, TURNS, turnsBetween, makeBox, heightAt, landing, solvedBox, keyC };
