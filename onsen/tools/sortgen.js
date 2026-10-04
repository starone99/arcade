const { parseLevel } = require('./logic.js');
const g = require('./generated.json');
const score = L => { const lv = parseLevel({ name: 'x', tip: '', ...L }); const cs = lv.cells;
  return cs.filter(c => c.kind === 'pipe' && !c.fixed).length + 2 * cs.filter(c => c.kind === 'cat').length + 3 * cs.filter(c => c.kind === 'tub').length; };
const out = [];
for (let ch = 0; ch < 9; ch++) out.push(...g.slice(ch * 10, ch * 10 + 10).map(L => [score(L), L]).sort((a, b) => a[0] - b[0]).map(x => x[1]));
require('fs').writeFileSync('generated.json', JSON.stringify(out));
console.log(out.map((L, i) => score(L)).join(' '));
