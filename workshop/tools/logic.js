// LOGIC START
// Cubes are [x, y, z] (y up). A part is a list of cubes with a colour each; shapes are normalised (min corner at 0).
const keyC = ([x, y, z]) => `${x},${y},${z}`;
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// a shape here is [[x, y, z, colour], ...]
function normalize(cs) {
  const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])), mz = Math.min(...cs.map(c => c[2]));
  return cs.map(([x, y, z, c]) => [x - mx, y - my, z - mz, c]).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
}
const shapeKey = (cs, colour) => normalize(cs).map(c => `${c[0]},${c[1]},${c[2]}${colour ? ':' + c[3] : ''}`).join(';');
const TURNS = {
  yaw: cs => normalize(cs.map(([x, y, z, c]) => [-z, y, x, c])),     // turn around the vertical axis
  pitch: cs => normalize(cs.map(([x, y, z, c]) => [x, -z, y, c])),   // stand it up
  roll: cs => normalize(cs.map(([x, y, z, c]) => [-y, x, z, c])),    // lay it on its side
};
// shortest button sequence that turns `from` into `to` (colours must line up when `colour` is set)
function turnsBetween(from, to, colour) {
  const goal = shapeKey(to, colour), start = normalize(from);
  const prev = new Map([[shapeKey(start, colour), null]]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const k = shapeKey(q[i], colour);
    if (k === goal) { const seq = []; for (let kk = k; prev.get(kk); kk = prev.get(kk)[0]) seq.unshift(prev.get(kk)[1]); return seq; }
    for (const [name, f] of Object.entries(TURNS)) { const n = f(q[i]), nk = shapeKey(n, colour); if (!prev.has(nk)) { prev.set(nk, [k, name]); q.push(n); } }
  }
  return null;
}

// rules: support = must touch the floor or a placed part; slide = there must be a straight way in from outside
function canSlideIn(cells, filled, bounds) {
  const own = new Set(cells.map(keyC));
  for (const [dx, dy, dz] of N6) {
    if (dy < 0) continue;                        // nothing comes up through the table
    let clear = true;
    for (const [x, y, z] of cells) {
      for (let t = 1; t < 16 && clear; t++) {
        const p = [x + dx * t, y + dy * t, z + dz * t];
        if (p[0] < bounds[0] - 1 || p[1] > bounds[1] + 1 || p[2] < bounds[2] - 1 || p[0] > bounds[3] + 1 || p[2] > bounds[4] + 1) break;
        const k = keyC(p);
        if (!own.has(k) && filled.has(k)) clear = false;
      }
      if (!clear) break;
    }
    if (clear) return [dx, dy, dz];
  }
  return null;
}
function touchesSupport(cells, filled) {
  const own = new Set(cells.map(keyC));
  return cells.some(([x, y, z]) => y === 0 || N6.some(([dx, dy, dz]) => { const k = keyC([x + dx, y + dy, z + dz]); return !own.has(k) && filled.has(k); }));
}
// every way to put `shape` (current orientation) so it covers `at` and matches empty blueprint cells exactly
function placementsCovering(shape, at, blueprint, filled, colour) {
  const out = [];
  for (const [sx, sy, sz] of shape) {
    const ox = at[0] - sx, oy = at[1] - sy, oz = at[2] - sz;
    const cells = shape.map(([x, y, z, c]) => [x + ox, y + oy, z + oz, c]);
    const ok = cells.every(c => { const k = keyC(c), want = blueprint.get(k); return want !== undefined && !filled.has(k) && (!colour || want === c[3]); });
    if (ok && !out.some(o => o.every((c, i) => keyC(c) === keyC(cells[i])))) out.push(cells);
  }
  return out;
}
// can this part go in now, under the stage's rules? returns null if fine, else the reason
function ruleBlock(cells, filled, rules, bounds) {
  if (rules.support && !touchesSupport(cells, filled)) return 'float';
  if (rules.slide && !canSlideIn(cells, filled, bounds)) return 'stuck';
  return null;
}
// LOGIC END
module.exports = { keyC, N6, normalize, shapeKey, TURNS, turnsBetween, canSlideIn, touchesSupport, placementsCovering, ruleBlock };
