const { LEVELS, parseLevel, flow, scramble, rotatable } = require('./logic.js');
LEVELS.forEach((L, i) => {
  const lv = parseLevel(L);
  for (const c of lv.cells) c.mask = c.sol;
  const f = flow(lv);
  const pipesUsed = lv.cells.filter(c => c.kind === 'pipe').length;
  const par = scramble(lv, i);
  const g = flow(lv);
  console.log(`${i + 1}. ${L.name.padEnd(10)} ${lv.W}x${lv.H} solved=${f.solved} tubs=${f.filled.length}/${f.tubs.length} cats=${f.wetCats.length} yuzu=${f.yuzu.length}/${(L.yuzu||[]).length} | rotatable=${lv.cells.filter(rotatable).length}/${pipesUsed} par=${par} scrambledSolved=${g.solved}`);
});
