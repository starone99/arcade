// order each village's generated stages from easiest to hardest, keeping the tutorial first
const { parseLevel } = require('./logic.js');
const g = require('./generated.json');
const score = L => { const cs = parseLevel({ name: 'x', ...L }).cells;
  return cs.filter(c => c.kind === 'pipe' && !c.fixed).length + 2 * cs.filter(c => c.kind === 'cat').length + 3 * cs.filter(c => c.kind === 'tub').length
    + 2 * cs.filter(c => c.leaf || c.ice || c.lift || c.cloud || c.gate || c.link !== undefined).length; };
const byVillage = new Map();
for (const L of g) { const v = Math.floor((L.stage - 1) / 10); if (!byVillage.has(v)) byVillage.set(v, []); byVillage.get(v).push(L); }
const out = [];
for (const [v, list] of byVillage) {
  const slots = list.map(L => L.stage).sort((a, b) => a - b);
  list.sort((a, b) => score(a) - score(b)).forEach((L, i) => out.push({ ...L, stage: slots[i] }));
}
require('fs').writeFileSync('generated.json', JSON.stringify(out));
console.log(out.map(L => `${L.stage}:${score(L)}`).join(' '));
