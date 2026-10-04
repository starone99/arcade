const { LEVELS, TUTORIALS, parseLevel, settle, scramble, resetState, solutionPath, units } = require('./logic.js');
const all = [...LEVELS.map((L, i) => [i + 1, L]), ...Object.entries(TUTORIALS).map(([n, L]) => [+n, { name: `tutorial ${n}`, ...L }])];
let bad = 0;
for (const [n, L] of all) {
  const lv = parseLevel(L);
  resetState(lv);
  for (const c of lv.cells) c.leafOn = false;   // the player clears leaves; ice must thaw on its own
  const { f } = settle(lv);
  const okGuide = (L.guide || []).every(g => { const c = lv.at(...g.at); return c && (g.until !== 'wet' || solutionPath(lv, c).length > 0); });
  const par = scramble(lv, n - 1);
  const start = settle(lv).f;
  const line = `${String(n).padStart(3)} ${L.name.padEnd(14)} solved=${f.solved} tubs=${f.filled.length}/${f.tubs.length} mixed=${f.mixed.length} cats=${f.wetCats.length} gate=${f.gateOpen} par=${par} units=${units(lv).length} startSolved=${start.solved} guide=${okGuide}`;
  if (!f.solved || start.solved || !okGuide) { bad++; console.log('BAD', line); } else console.log(line);
}
console.log('bad', bad);
