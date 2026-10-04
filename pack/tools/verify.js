const { normalize, shapeKey, makeBox, landing, solvedBox, keyC, turnsBetween } = require('./logic.js');
const levels = require('./levels.json');
let bad = 0;
levels.forEach((L, li) => {
  const box = makeBox(L), pieces = L.pieces;
  for (const i of L.order) {
    const p = pieces[i], target = normalize(p.cells);
    if (!turnsBetween(p.start, target)) { bad++; console.log('NO TURN', li + 1, i); return; }
    const ax = Math.min(...p.cells.map(c => c[0])), az = Math.min(...p.cells.map(c => c[2]));
    const land = landing(box, target, ax, az, p, pieces);
    const want = new Set(p.cells.map(keyC));
    if (!land.ok || land.holes || !land.cells.every(c => want.has(keyC(c)))) { bad++; console.log('BAD DROP', li + 1, i, land.why); return; }
    for (const c of land.cells) box.filled.set(keyC(c), i);
  }
  if (!solvedBox(box)) { bad++; console.log('NOT FULL', li + 1); }
});
console.log('levels', levels.length, 'bad', bad);
