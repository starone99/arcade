// LOGIC START
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];   // dx, dz, bit, opposite bit
const BOX = { '─': E|W, '│': N|S, '┌': E|S, '┐': S|W, '└': N|E, '┘': N|W, '├': N|E|S, '┤': N|S|W, '┬': E|S|W, '┴': N|E|W, '┼': N|E|S|W };
const rotCW = m => ((m << 1) | (m >> 3)) & 15;

const LEVELS = [
  { name: '첫 온천', tip: '물길을 눌러 돌려요. 원천의 온천물을 욕조까지 이어주세요.',
    tiles: ['S─┐', '..│', '..T'], heights: ['222', '111', '000'] },
  { name: '갈림길', tip: '갈림길 하나로 두 마리 모두에게 물을 나눠 줄 수 있어요.',
    tiles: ['..S..', '..│..', '┌─┴─┐', '│...│', 'T...T'], heights: ['33333', '22222', '22222', '11111', '00000'] },
  { name: '물은 아래로', tip: '물은 높은 곳으로 올라가지 못해요. 섬을 돌려 높이를 살펴보세요.',
    tiles: ['S─┬─T', '..└─┘', '.....'], heights: ['22230', '11111', '00000'] },
  { name: '낮잠 자는 고양이', tip: '고양이는 물을 싫어해요. 고양이 쪽으로 물이 흐르지 않게 해주세요.',
    tiles: ['S┴─┐', '.│.│', '.C.│', '...T'], heights: ['3333', '2222', '1111', '0000'] },
  { name: '돌 물길', tip: '돌로 된 물길은 돌릴 수 없어요. 계단을 따라 물이 떨어져요.',
    tiles: ['S──┐.', '┌──┘.', '│.C..', '└─┬─T'], heights: ['33333', '22223', '11111', '11100'], fixed: [[1, 0], [2, 1]] },
  { name: '유자 띄우기', tip: '유자 상자에 물이 닿으면 유자를 얻어요. 꼭 모으지 않아도 괜찮아요.',
    tiles: ['..│..', 'S─┴─┐', '│.C.│', '│...│', 'T...T'], heights: ['22222', '22222', '11111', '11111', '00000'], yuzu: [[2, 0]] },
  { name: '세 마리 손님', tip: '욕조 세 개를 모두 채워주세요.',
    tiles: ['┌─┴─┬S', '│.C.│.', '│...├T', '└┐..│.', '.T..T.'], heights: ['333333', '222222', '222221', '111111', '000000'], fixed: [[2, 0]] },
  { name: '계곡 폭포', tip: '열십자 물길은 돌려도 모양이 그대로예요.',
    tiles: ['..S...', '.┌┼┐..', '.│││..', '.││┴─┐', '.│TC.│', 'T┘..T┘'], heights: ['444444', '333333', '333333', '222222', '111111', '000000'], fixed: [[1, 3]] },
  { name: '두 고양이', tip: '고양이 두 마리가 낮잠을 자요. 조용히 비켜 가요.',
    tiles: ['S─┬──┐', 'C.│..│', '┌─┤.C│', '│.│.┌┘', 'T.T.T.'], heights: ['333333', '222222', '222222', '111111', '000000'], yuzu: [[4, 0]] },
  { name: '모두 함께 온천', tip: '온 마을 카피바라가 기다리고 있어요.',
    tiles: ['...S...', '─┬─┼─┐.', '.│.│.│.', '┌┴┐T┌┴┐', '│C│.│C│', 'T.T.T.T'], heights: ['4444444', '3333333', '3333333', '2222222', '1111111', '0000000'],
    fixed: [[2, 1], [3, 2]], yuzu: [[0, 1]] },
];

function parseLevel(L) {
  const H = L.tiles.length, Wd = L.tiles[0].length;
  const cells = [];
  for (let z = 0; z < H; z++) {
    const row = [...L.tiles[z]];
    if (row.length !== Wd || L.heights[z].length !== Wd) throw new Error(`${L.name}: row ${z} width mismatch`);
    for (let x = 0; x < Wd; x++) {
      const ch = row[x], h = +L.heights[z][x];
      const c = { x, z, h, kind: 'empty', sol: 0, mask: 0, fixed: false, yuzu: false };
      if (ch === 'S') c.kind = 'src';
      else if (ch === 'T') c.kind = 'tub';
      else if (ch === 'C') c.kind = 'cat';
      else if (BOX[ch] !== undefined) { c.kind = 'pipe'; c.sol = c.mask = BOX[ch]; }
      else if (ch !== '.') throw new Error(`${L.name}: unknown tile ${ch}`);
      cells.push(c);
    }
  }
  const at = (x, z) => (x >= 0 && z >= 0 && x < Wd && z < H ? cells[z * Wd + x] : null);
  for (const [x, z] of L.fixed || []) { const c = at(x, z); if (c.kind !== 'pipe') throw new Error(`${L.name}: fixed ${x},${z} is not a pipe`); c.fixed = true; }
  for (const [x, z] of L.yuzu || []) { const c = at(x, z); if (c.kind !== 'pipe') throw new Error(`${L.name}: yuzu ${x},${z} is not a pipe`); c.yuzu = true; }
  const src = cells.find(c => c.kind === 'src');
  if (!src) throw new Error(`${L.name}: no source`);
  for (const [dx, dz, bit, opp] of DIRS) {
    const n = at(src.x + dx, src.z + dz);
    if (n && ((n.kind === 'pipe' && n.sol & opp) || n.kind === 'tub')) src.sol = src.mask |= bit;
  }
  return { name: L.name, tip: L.tip, W: Wd, H, cells, at, src };
}

// water spreads from the spring; it never climbs to a higher cell
function flow(lv) {
  const wet = new Set([lv.src]), queue = [lv.src], links = [], spills = [];
  while (queue.length) {
    const c = queue.shift();
    for (const [dx, dz, bit, opp] of DIRS) {
      if (!(c.mask & bit)) continue;
      const n = lv.at(c.x + dx, c.z + dz);
      const accepts = n && ((n.kind === 'pipe' && n.mask & opp) || n.kind === 'tub' || n.kind === 'cat');
      if (!accepts || n.h > c.h) { spills.push({ c, bit, blocked: !!(accepts && n.h > c.h) }); continue; }
      links.push({ a: c, b: n, bit });
      if (!wet.has(n)) { wet.add(n); if (n.kind === 'pipe') queue.push(n); }
    }
  }
  const tubs = lv.cells.filter(c => c.kind === 'tub');
  return {
    wet, links, spills,
    filled: tubs.filter(t => wet.has(t)),
    tubs,
    wetCats: lv.cells.filter(c => c.kind === 'cat' && wet.has(c)),
    yuzu: lv.cells.filter(c => c.yuzu && wet.has(c)),
    solved: tubs.every(t => wet.has(t)) && !lv.cells.some(c => c.kind === 'cat' && wet.has(c)),
  };
}

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rotatable = c => c.kind === 'pipe' && !c.fixed && c.sol !== 15;
function stepsTo(c) { let m = c.mask, k = 0; while (m !== c.sol) { m = rotCW(m); k++; } return k; }

// same scramble every time for a level, so records stay comparable
function scramble(lv, index) {
  for (let seed = index * 7919 + 17; ; seed++) {
    const rnd = mulberry32(seed);
    for (const c of lv.cells) if (rotatable(c)) { c.mask = c.sol; c.k = Math.floor(rnd() * 4); for (let i = 0; i < c.k; i++) c.mask = rotCW(c.mask); }
    const par = lv.cells.filter(rotatable).reduce((s, c) => s + stepsTo(c), 0);
    if (!flow(lv).solved && par >= Math.min(3, lv.cells.filter(rotatable).length)) return par;
  }
}
// LOGIC END
module.exports = { LEVELS, parseLevel, flow, scramble, rotatable, stepsTo, rotCW };
