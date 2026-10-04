// Procedural voxel models. Colours: w light wood, W dark wood, n brown, r red, b blue, c glass, g green, G dark green,
// y yellow, o orange, k charcoal, s white, p pink, m stone, l lavender
function model(r) {
  const cells = new Map();
  const put = (x, y, z, c) => cells.set(`${x},${y},${z}`, [x, y, z, c]);
  const box = (x0, y0, z0, x1, y1, z1, c) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, typeof c === 'function' ? c(x, y, z) : c); };
  const pick = a => a[Math.floor(r() * a.length)];
  return { cells, put, box, pick, done: name => ({ name, cells: [...cells.values()] }) };
}
const FAMILIES = {
  house(r, big) {
    const m = model(r), w = big ? 4 + Math.floor(r() * 2) : 3, d = big ? 3 + Math.floor(r() * 2) : 3, wall = m.pick(['w', 's', 'p']), roof = m.pick(['r', 'b', 'G']);
    m.box(0, 0, 0, w - 1, 1, d - 1, wall);
    m.put(Math.floor(w / 2), 0, d - 1, 'n'); if (big) m.put(0, 1, 1, 'c'), m.put(w - 1, 1, 1, 'c');
    for (let k = 0; k * 2 < d; k++) m.box(0, 2 + k, k, w - 1, 2 + k, d - 1 - k, roof);
    if (big) m.put(w - 1, 3, 0, 'm');
    return m.done({ r: '빨간 지붕 집', b: '파란 지붕 집', G: '초록 지붕 집' }[roof]);
  },
  tree(r, big) {
    const m = model(r), h = big ? 3 : 2, rad = big ? 2 : 1, cy = h + rad;
    m.box(rad, 0, rad, rad, h - 1, rad, 'n');
    for (let x = 0; x <= rad * 2; x++) for (let y = h; y <= h + rad * 2; y++) for (let z = 0; z <= rad * 2; z++) {
      if ((x - rad) ** 2 + (y - cy) ** 2 + (z - rad) ** 2 <= rad * rad + 1) m.put(x, y, z, r() < 0.12 ? 'o' : r() < 0.5 ? 'g' : 'G');
    }
    return m.done(big ? '귤나무' : '작은 나무');
  },
  lighthouse(r, big) {
    const m = model(r), h = big ? 5 : 4;
    if (big) m.box(0, 0, 0, 3, 0, 3, 'm');
    const o = big ? 1 : 0;
    m.box(o, big ? 1 : 0, o, o + 1, h - 1, o + 1, (x, y) => (y % 2 ? 'r' : 's'));
    m.box(o, h, o, o + 1, h, o + 1, 'y'); m.box(o, h + 1, o, o + 1, h + 1, o + 1, 'r');
    return m.done('등대');
  },
  boat(r, big) {
    const m = model(r), L = big ? 6 : 5, hull = m.pick(['n', 'W', 'b']);
    m.box(1, 0, 0, L - 2, 0, 1, hull); m.box(0, 1, 0, L - 1, 1, 1, hull);
    const mx = Math.floor(L / 2);
    m.box(mx, 2, 0, mx, big ? 5 : 4, 0, 'k'); m.box(mx - 2, 3, 1, mx - 1, big ? 5 : 4, 1, 's');
    if (big) m.put(mx, 6, 0, 'r');
    return m.done('돛단배');
  },
  car(r, big) {
    const m = model(r), L = big ? 5 : 4, col = m.pick(['r', 'b', 'y', 'g']);
    m.box(0, 1, 0, L - 1, 1, 2, col);
    m.box(1, 2, 0, L - 2, 2, 2, (x, y, z) => (z === 1 ? col : 'c'));
    if (big) m.box(1, 3, 0, L - 2, 3, 2, col);
    for (const x of [0, L - 1]) for (const z of [0, 2]) m.put(x, 0, z, 'k');
    return m.done({ r: '빨간 자동차', b: '파란 자동차', y: '노란 택시', g: '초록 자동차' }[col]);
  },
  mushroom(r, big) {
    const m = model(r), s = big ? 2 : 1, cap = m.pick(['r', 'o', 'l']), cw = big ? 4 : 3;
    const off = Math.floor((cw - s) / 2);
    m.box(off, 0, off, off + s - 1, big ? 2 : 1, off + s - 1, 's');
    const y0 = big ? 3 : 2;
    m.box(0, y0, 0, cw - 1, y0, cw - 1, (x, y, z) => ((x + z) % 3 === 0 ? 's' : cap));
    m.box(1, y0 + 1, 1, cw - 2, y0 + 1, cw - 2, cap);
    return m.done('버섯');
  },
  rocket(r, big) {
    const m = model(r), h = big ? 5 : 4, fin = m.pick(['b', 'r', 'o']);
    m.box(1, 1, 1, 2, h, 2, (x, y) => (y === Math.floor(h / 2) + 1 ? 'c' : 's'));
    m.put(1, h + 1, 1, 'r'); m.put(2, h + 1, 2, 'r'); if (big) m.put(1, h + 2, 1, 'r');
    for (const [x, z] of [[0, 1], [3, 2], [2, 0], [1, 3]]) m.box(x, 0, z, x, 1, z, fin);
    m.box(1, 0, 1, 2, 0, 2, 'k');
    return m.done('로켓');
  },
  duck(r, big) {
    const m = model(r);
    m.box(0, 0, 0, big ? 3 : 2, 1, 1, 'y');
    m.box(big ? 2 : 1, 2, 0, big ? 3 : 2, 3, 1, 'y');
    m.put(big ? 4 : 3, 3, 0, 'o'); m.put(big ? 4 : 3, 3, 1, 'o');
    if (big) m.put(3, 3, 0, 'k');
    return m.done('고무 오리');
  },
  table(r, big) {
    const m = model(r), w = big ? 4 : 3, top = m.pick(['w', 'W']);
    for (const x of [0, w - 1]) for (const z of [0, 2]) m.box(x, 0, z, x, 1, z, 'n');
    m.box(0, 2, 0, w - 1, 2, 2, top);
    if (big) { m.put(1, 3, 1, 'r'); m.put(2, 3, 1, 'y'); }
    return m.done(big ? '꽃병 올린 식탁' : '작은 식탁');
  },
  windmill(r, big) {
    const m = model(r);
    m.box(1, 0, 1, 2, big ? 3 : 2, 2, 'm');
    m.box(1, big ? 4 : 3, 1, 2, big ? 4 : 3, 2, 'r');
    const cy = big ? 3 : 2, z = 3;
    m.put(1, cy, z, 'W');
    for (let k = 1; k <= (big ? 2 : 1); k++) { m.put(1 + k, cy, z, 's'); m.put(1 - k, cy, z, 's'); m.put(1, cy + k, z, 's'); if (cy - k >= 0) m.put(1, cy - k, z, 's'); }
    return m.done('풍차');
  },
  cake(r, big) {
    const m = model(r), cream = m.pick(['p', 's', 'y']);
    m.box(0, 0, 0, 3, 0, 3, 'n'); m.box(0, 1, 0, 3, 1, 3, cream);
    if (big) { m.box(1, 2, 1, 2, 2, 2, 'n'); m.box(1, 3, 1, 2, 3, 2, cream); m.put(1, 4, 1, 'r'); m.put(2, 4, 2, 'y'); }
    else { m.put(1, 2, 1, 'r'); m.put(2, 2, 2, 'r'); }
    return m.done({ p: '딸기 케이크', s: '생크림 케이크', y: '레몬 케이크' }[cream]);
  },
  snowman(r, big) {
    const m = model(r);
    m.box(0, 0, 0, 2, 1, 2, 's'); m.box(0, 2, 0, 2, 3, 2, 's');
    m.put(1, 3, 3, 'o'); m.put(0, 3, 3, 'k');
    m.box(0, 4, 0, 2, 4, 2, 'k'); if (big) m.box(1, 5, 1, 1, 5, 1, 'k'), m.put(2, 2, 3, 'r');
    return m.done('눈사람');
  },
  tower(r, big) {
    const m = model(r), h = big ? 4 : 3;
    m.box(0, 0, 0, 2, h - 1, 2, 'm'); m.put(1, 0, 2, 'n');
    for (const [x, z] of [[0, 0], [2, 0], [0, 2], [2, 2]]) m.put(x, h, z, 'm');
    m.box(1, h, 1, 1, h + (big ? 2 : 1), 1, 'k'); m.put(1, h + (big ? 2 : 1), 0, 'r');
    return m.done('성탑');
  },
  robot(r, big) {
    const m = model(r), col = m.pick(['m', 'b', 'l']);
    m.put(0, 0, 0, 'k'); m.put(2, 0, 0, 'k'); m.box(0, 1, 0, 2, 2, 1, col);
    m.box(0, 3, 0, 2, 3, 1, 's'); m.put(0, 3, 2, 'c'); m.put(2, 3, 2, 'c');
    m.box(-1, 2, 0, -1, 2, 0, col); m.box(3, 2, 0, 3, 2, 0, col);
    if (big) { m.put(1, 4, 0, 'r'); m.put(-1, 1, 0, 'y'); m.put(3, 1, 0, 'y'); }
    return m.done('로봇');
  },
  cactus(r, big) {
    const m = model(r);
    m.box(0, 0, 0, 2, 0, 2, 'o'); m.box(1, 1, 1, 1, big ? 4 : 3, 1, 'G');
    m.box(0, 2, 1, 0, 3, 1, 'G'); m.box(2, big ? 3 : 2, 1, 2, big ? 4 : 3, 1, 'G');
    if (big) m.put(1, 5, 1, 'p');
    return m.done('선인장 화분');
  },
  bridge(r, big) {
    const m = model(r), L = big ? 6 : 5;
    m.box(0, 0, 0, 0, 1, 1, 'm'); m.box(L - 1, 0, 0, L - 1, 1, 1, 'm');
    m.box(0, 2, 0, L - 1, 2, 1, 'w');
    if (big) for (let x = 0; x < L; x += 2) m.put(x, 3, 0, 'n');
    m.box(1, 1, 0, 1, 1, 1, 'm'); m.box(L - 2, 1, 0, L - 2, 1, 1, 'm');
    return m.done('돌다리');
  },
};
const FAMILY_ORDER = ['house', 'tree', 'car', 'mushroom', 'duck', 'table', 'boat', 'lighthouse', 'cake', 'rocket', 'snowman', 'windmill', 'tower', 'robot', 'cactus', 'bridge'];
module.exports = { FAMILIES, FAMILY_ORDER };
