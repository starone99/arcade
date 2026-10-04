// LOGIC START
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];   // dx, dz, bit, opposite bit
const BOX = { '─': E|W, '│': N|S, '┌': E|S, '┐': S|W, '└': N|E, '┘': N|W, '├': N|E|S, '┤': N|S|W, '┬': E|S|W, '┴': N|E|W, '┼': N|E|S|W };
const rotCW = m => ((m << 1) | (m >> 3)) & 15;
const rotBy = (m, k) => { for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = rotCW(m); return m; };

// Tiles: S/Q spring (Q = second colour), T tub, A/B tub that wants spring S/Q water, C cat, . grass, box chars = pipes.
// Extras by [x, z]: fixed, yuzu, gate, scale, links [[a, b]], leaves, ice, lift [x, z, otherHeight], cloud.
// intro: gimmick card shown the first time; guide: coach steps { at: [x, z], until: wet|clear|thaw|height|sol, text }.
const LEVELS = [
  { name: '첫 온천', intro: 'goal',
    tiles: ['S─┐', '..│', '..T'], heights: ['222', '111', '000'],
    guide: [{ at: [2, 2], until: 'wet', text: '반짝이는 물길을 눌러 돌려요. 원천에서 욕조까지 물길을 이어 주세요.' }] },
  { name: '갈림길', tip: '갈림길 하나로 두 마리 모두에게 물을 나눠 줄 수 있어요.',
    tiles: ['..S..', '..│..', '┌─┴─┐', '│...│', 'T...T'], heights: ['33333', '22222', '22222', '11111', '00000'] },
  { name: '물은 아래로', intro: 'height', tip: '물은 높은 곳으로 올라가지 못해요. 섬을 돌려 높이를 살펴보세요.',
    tiles: ['S─┬─T', '..└─┘', '.....'], heights: ['22230', '11111', '00000'] },
  { name: '낮잠 자는 고양이', intro: 'cat', tip: '고양이 쪽으로 물이 흐르지 않게 갈림길 방향을 정해 주세요.',
    tiles: ['S┴─┐', '.│.│', '.C.│', '...T'], heights: ['3333', '2222', '1111', '0000'] },
  { name: '돌 물길', intro: 'stone', tip: '돌로 된 물길은 돌릴 수 없어요. 계단을 따라 물이 떨어져요.',
    tiles: ['S──┐.', '┌──┘.', '│.C..', '└─┬─T'], heights: ['33333', '22223', '11111', '11100'], fixed: [[1, 0], [2, 1]] },
  { name: '유자 띄우기', intro: 'yuzu', tip: '유자 상자에 물이 닿으면 유자를 얻어요. 꼭 모으지 않아도 괜찮아요.',
    tiles: ['..│..', 'S─┴─┐', '│.C.│', '│...│', 'T...T'], heights: ['22222', '22222', '11111', '11111', '00000'], yuzu: [[2, 0]] },
  { name: '세 마리 손님', tip: '욕조 세 개를 모두 채워 주세요.',
    tiles: ['┌─┴─┬S', '│.C.│.', '│...├T', '└┐..│.', '.T..T.'], heights: ['333333', '222222', '222221', '111111', '000000'], fixed: [[2, 0]] },
  { name: '계곡 폭포', tip: '열십자 물길은 돌려도 모양이 그대로예요.',
    tiles: ['..S...', '.┌┼┐..', '.│││..', '.││┴─┐', '.│TC.│', 'T┘..T┘'], heights: ['333333', '333333', '333333', '222222', '111111', '000000'], fixed: [[1, 3]] },
  { name: '두 고양이', tip: '고양이 두 마리가 낮잠을 자요. 조용히 비켜 가요.',
    tiles: ['S─┬──┐', 'C.│..│', '┌─┤.C│', '│.│.┌┘', 'T.T.T.'], heights: ['333333', '222222', '222222', '111111', '000000'], yuzu: [[4, 0]] },
  { name: '모두 함께 온천', tip: '첫 마을의 마지막 온천이에요. 지금까지 배운 걸 모두 써 보세요.',
    tiles: ['...S...', '─┬─┼─┐.', '.│.│.│.', '┌┴┐T┌┴┐', '│C│.│C│', 'T.T.T.T'], heights: ['3333333', '3333333', '3333333', '2222222', '1111111', '0000000'],
    fixed: [[2, 1], [3, 2]], yuzu: [[0, 1]] },
];

// first stage of each later village teaches its gimmick
const TUTORIALS = {
  11: { intro: 'gate', tiles: ['S─┬─┐', '..│.│', '..│.│', '....T'], heights: ['22222', '22222', '11111', '00000'],
    gate: [[4, 1]], scale: [[2, 2]],
    guide: [{ at: [2, 2], until: 'wet', text: '먼저 유자 저울까지 물을 보내요. 저울이 젖으면 수문이 열려요.' },
            { at: [4, 3], until: 'wet', text: '수문이 열렸어요! 이제 욕조까지 이어 주세요.' }] },
  21: { intro: 'link', tiles: ['S─┐', '┌─┘', '└─T'], heights: ['222', '111', '000'], links: [[[1, 0], [1, 2]]],
    guide: [{ at: [1, 0], until: 'sol', text: '끈으로 묶인 물길은 함께 돌아요. 반짝이는 물길을 돌려 보세요.' },
            { at: [2, 2], until: 'wet', text: '아래쪽 짝꿍도 같이 돌았죠? 나머지도 이어 주세요.' }] },
  31: { intro: 'leaves', tiles: ['S─┐.', '.─│.', 'C.└T'], heights: ['2222', '1111', '1110'], leaves: [[2, 1], [1, 1]],
    guide: [{ at: [2, 1], until: 'clear', text: '낙엽에 덮인 물길은 물이 지나가지 못해요. 눌러서 치워 주세요.' },
            { at: [3, 2], until: 'wet', text: '낙엽 밑에 숨은 물길이 보이죠? 욕조까지 이어 주세요.' }] },
  41: { intro: 'ice', tiles: ['S─┐.', '..│.', '..└T'], heights: ['2222', '1111', '1110'], ice: [[2, 1]],
    guide: [{ at: [2, 1], until: 'thaw', text: '얼어붙은 물길은 돌릴 수 없어요. 따끈한 물을 바로 옆까지 보내 녹여요.' },
            { at: [2, 1], until: 'sol', text: '녹았어요! 이제 돌릴 수 있어요.' },
            { at: [3, 2], until: 'wet', text: '욕조까지 이어 주세요.' }] },
  51: { intro: 'lift', tiles: ['S─┐.', '..│.', '..└T'], heights: ['2222', '1111', '1110'], lift: [[2, 1, 3]],
    guide: [{ at: [2, 1], until: 'height', text: '높낮이 블록은 누를 때마다 한 칸씩 오르내려요. 너무 높으면 물이 못 올라가요.' },
            { at: [3, 2], until: 'wet', text: '좋아요! 이제 욕조까지 이어 주세요.' }] },
  61: { intro: 'springs', tiles: ['S...S', '│...│', '└─T.T'], heights: ['22222', '11111', '00000'],
    guide: [{ at: [2, 2], until: 'wet', text: '원천이 두 개예요. 왼쪽 원천에서 가운데 욕조로 이어 주세요.' },
            { at: [4, 2], until: 'wet', text: '오른쪽 원천은 오른쪽 욕조로요.' }] },
  71: { intro: 'cloud', tiles: ['S─┐.', '..│.', '..└T'], heights: ['2222', '1111', '1222'], cloud: [[2, 1]],
    guide: [{ at: [2, 1], until: 'wet', text: '구름 물길까지 물을 보내 보세요.' },
            { at: [3, 2], until: 'wet', text: '구름 물길은 물을 한 칸 높은 곳으로도 올려 줘요. 언덕 위 욕조까지 이어 주세요.' }] },
  81: { intro: 'colors', tiles: ['S...Q', '│...│', '└┐┬┌┘', '.A.B.'], heights: ['33333', '22222', '11111', '00000'],
    guide: [{ at: [1, 3], until: 'wet', text: '주황 유자탕 원천은 주황 욕조로 보내요.' },
            { at: [3, 3], until: 'wet', text: '초록 쑥탕 원천은 초록 욕조로요. 두 물이 섞이면 카피바라가 들어가지 않아요.' }] },
};

function parseLevel(L) {
  const H = L.tiles.length, Wd = [...L.tiles[0]].length;
  const cells = [];
  for (let z = 0; z < H; z++) {
    const row = [...L.tiles[z]];
    if (row.length !== Wd || L.heights[z].length !== Wd) throw new Error(`${L.name}: row ${z} width mismatch`);
    for (let x = 0; x < Wd; x++) {
      const ch = row[x], h = +L.heights[z][x];
      const c = { x, z, h, hSol: h, kind: 'empty', sol: 0, mask: 0, k: 0 };
      if (ch === 'S' || ch === 'Q') { c.kind = 'src'; c.color = ch === 'Q' ? 'b' : 'a'; }
      else if (ch === 'T' || ch === 'A' || ch === 'B') { c.kind = 'tub'; c.want = ch === 'A' ? 'a' : ch === 'B' ? 'b' : null; }
      else if (ch === 'C') c.kind = 'cat';
      else if (BOX[ch] !== undefined) { c.kind = 'pipe'; c.sol = c.mask = BOX[ch]; }
      else if (ch !== '.') throw new Error(`${L.name}: unknown tile ${ch}`);
      cells.push(c);
    }
  }
  const at = (x, z) => (x >= 0 && z >= 0 && x < Wd && z < H ? cells[z * Wd + x] : null);
  const pipeAt = (x, z, what) => { const c = at(x, z); if (!c || c.kind !== 'pipe') throw new Error(`${L.name}: ${what} ${x},${z} is not a pipe`); return c; };
  for (const [x, z] of L.fixed || []) pipeAt(x, z, 'fixed').fixed = true;
  for (const [x, z] of L.yuzu || []) pipeAt(x, z, 'yuzu').yuzu = true;
  for (const [x, z] of L.gate || []) { const c = pipeAt(x, z, 'gate'); c.gate = true; c.fixed = true; }
  for (const [x, z] of L.scale || []) pipeAt(x, z, 'scale').scale = true;
  for (const [x, z] of L.leaves || []) pipeAt(x, z, 'leaves').leaf = true;
  for (const [x, z] of L.ice || []) pipeAt(x, z, 'ice').ice = true;
  for (const [x, z] of L.cloud || []) pipeAt(x, z, 'cloud').cloud = true;
  for (const [x, z, alt] of L.lift || []) { const c = pipeAt(x, z, 'lift'); c.lift = true; c.fixed = true; c.hAlt = alt; }
  (L.links || []).forEach((pair, id) => pair.forEach(([x, z]) => { const c = pipeAt(x, z, 'link'); if (c.fixed) throw new Error(`${L.name}: linked pipe is fixed`); c.link = id; }));
  const srcs = cells.filter(c => c.kind === 'src');
  if (!srcs.length) throw new Error(`${L.name}: no spring`);
  for (const s of srcs) for (const [dx, dz, bit, opp] of DIRS) {
    const n = at(s.x + dx, s.z + dz);
    if (n && n.kind === 'pipe' && n.sol & opp) s.sol = s.mask |= bit;
  }
  const colored = srcs.some(s => s.color === 'b');
  const lv = { name: L.name, W: Wd, H, cells, at, srcs, colored, guide: L.guide || null };
  resetState(lv);
  return lv;
}

// solved arrangement with every gimmick in its starting state (ice frozen, leaves on, lifts where they belong)
function resetState(lv) {
  for (const c of lv.cells) { c.mask = c.sol; c.k = 0; c.h = c.hSol; c.leafOn = !!c.leaf; c.iceOn = !!c.ice; }
}
const passable = (c, gateOpen) => c.kind === 'pipe' && !c.leafOn && !c.iceOn && (!c.gate || gateOpen);

function flowOnce(lv, gateOpen) {
  const wet = new Map(), links = [], touches = new Set();
  for (const s of lv.srcs) {
    const color = s.color;
    const mark = c => { if (!wet.has(c)) wet.set(c, new Set()); const had = wet.get(c).has(color); wet.get(c).add(color); return !had; };
    mark(s);
    const queue = [s];
    while (queue.length) {
      const c = queue.shift();
      for (const [dx, dz, bit, opp] of DIRS) {
        if (!(c.mask & bit)) continue;
        const n = lv.at(c.x + dx, c.z + dz);
        if (!n) continue;
        const reach = n.h <= c.h || c.cloud;          // water never climbs, except out of a cloud
        if (!reach) continue;
        touches.add(n);
        const accepts = n.kind === 'tub' || n.kind === 'cat' || (n.kind === 'pipe' && passable(n, gateOpen) && n.mask & opp);
        if (!accepts) continue;
        links.push({ a: c, b: n, bit, color });
        if (mark(n) && n.kind === 'pipe') queue.push(n);
      }
    }
  }
  return { wet, links, touches };
}

function flow(lv) {
  const scales = lv.cells.filter(c => c.scale);
  let r = flowOnce(lv, false), gateOpen = false;
  if (scales.length && scales.every(c => r.wet.has(c))) { gateOpen = true; r = flowOnce(lv, true); }
  const tubs = lv.cells.filter(c => c.kind === 'tub');
  const happy = t => { const w = r.wet.get(t); if (!w) return false; return t.want ? w.size === 1 && w.has(t.want) : (!lv.colored || w.size === 1); };
  const filled = tubs.filter(happy);
  return {
    ...r, gateOpen, tubs, filled,
    mixed: tubs.filter(t => r.wet.has(t) && !happy(t)),
    wetCats: lv.cells.filter(c => c.kind === 'cat' && r.wet.has(c)),
    yuzu: lv.cells.filter(c => c.yuzu && r.wet.has(c)),
    solved: filled.length === tubs.length && !lv.cells.some(c => c.kind === 'cat' && r.wet.has(c)),
  };
}

// thaw any ice the water has reached, until nothing changes; returns the final flow and what melted
function settle(lv) {
  const thawed = [];
  for (;;) {
    const f = flow(lv);
    const melt = lv.cells.filter(c => c.iceOn && f.touches.has(c));
    if (!melt.length) return { f, thawed };
    for (const c of melt) { c.iceOn = false; thawed.push(c); }
  }
}

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rotatable = c => c.kind === 'pipe' && !c.fixed && c.sol !== 15;
// tiles that turn together: a link group, or a single pipe
function units(lv) {
  const groups = new Map(), out = [];
  for (const c of lv.cells) {
    if (!rotatable(c)) continue;
    if (c.link === undefined) out.push([c]);
    else { if (!groups.has(c.link)) { groups.set(c.link, []); out.push(groups.get(c.link)); } groups.get(c.link).push(c); }
  }
  return out;
}
function stepsTo(unit) { for (let k = 0; k < 4; k++) if (unit.every(c => rotBy(c.mask, k) === c.sol)) return k; return 0; }

// same scramble every time for a stage, so records stay comparable; returns par (taps for the intended solution)
function scramble(lv, index) {
  const us = units(lv);
  for (let seed = index * 7919 + 17; seed < index * 7919 + 17 + 5000; seed++) {
    const rnd = mulberry32(seed);
    resetState(lv);
    for (const u of us) {
      let k = Math.floor(rnd() * 4);
      // ice and leaves only mean something if the tile underneath also needs turning
      if (u.some(c => c.ice || c.leaf)) while (rotBy(u[0].sol, k) === u[0].sol) k = (k + 1) % 4;
      for (const c of u) { c.k = k; c.mask = rotBy(c.sol, k); }
    }
    for (const c of lv.cells) if (c.lift) c.h = c.hAlt;
    const par = us.reduce((s, u) => s + stepsTo(u), 0) + lv.cells.filter(c => c.leaf).length + lv.cells.filter(c => c.lift).length;
    const solvedAtStart = settle(lv).f.solved;
    for (const c of lv.cells) c.iceOn = !!c.ice;          // settle may have thawed; the player starts frozen
    if (!solvedAtStart && par >= Math.min(3, us.length)) return par;
  }
  throw new Error(`${lv.name}: no scramble leaves the stage unsolved`);
}

// the intended route from a spring to a target, used by the coach and by hints
function solutionPath(lv, target) {
  const prev = new Map(), q = [];
  for (const s of lv.srcs) { prev.set(s, null); q.push(s); }
  while (q.length) {
    const c = q.shift();
    if (c === target) break;
    for (const [dx, dz, bit, opp] of DIRS) {
      if (!(c.sol & bit)) continue;
      const n = lv.at(c.x + dx, c.z + dz);
      if (!n || prev.has(n)) continue;
      if (!(n.kind === 'tub' || n.kind === 'cat' || (n.kind === 'pipe' && n.sol & opp))) continue;
      if (n.kind === 'tub' && n.want && n.want !== srcColorOf(lv, c, prev)) continue;
      prev.set(n, c); if (n.kind === 'pipe') q.push(n); else if (n === target) { q.length = 0; break; }
    }
  }
  if (!prev.has(target)) return [];
  const path = [];
  for (let c = target; c; c = prev.get(c)) path.unshift(c);
  return path;
}
function srcColorOf(lv, c, prev) { while (prev.get(c)) c = prev.get(c); return c.color; }
// what still needs doing on a cell before it carries water the intended way
function needsWork(c) {
  if (c.kind !== 'pipe') return null;
  if (c.leafOn) return 'clear';
  if (c.lift && c.h !== c.hSol) return 'height';
  if (c.iceOn && c.mask !== c.sol) return 'thaw';
  if (rotatable(c) && c.mask !== c.sol) return 'sol';
  return null;
}
// LOGIC END
module.exports = { LEVELS, TUTORIALS, parseLevel, flow, settle, scramble, rotatable, units, stepsTo, rotCW, rotBy, resetState, solutionPath, needsWork, mulberry32, DIRS, BOX };
