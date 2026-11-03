// node tests/pricing.test.mjs — checks src/lib/pricing.js against the sheet's PRECIO.
import assert from 'node:assert/strict';
import { computeClientPrice, discountPercent, isNewPriceEra, priceTable } from '../src/lib/pricing.js';

const prices = { FOTO: 35000, VIDEO: 35000, REEL: 35000, TH: 55000, PLANO: 35000, TOUR: 35000, DRONE: 185000, FPV: 185000 };
const k = { discountThreshold: 3, discountPct: 0.035, discountDecay: 1 };
const one = (services, mult = 1, extras = 0, constants = k) => computeClientPrice({ units: [{ services, mult, extras }], prices, constants });
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('3 services: no discount', () => assert.equal(one(['FOTO', 'VIDEO', 'REEL']).total, 135000));
// Valeria Bellocq / Grupo Marting row, 4 services @ 150 m² (x1.15): the sheet says 188,657
t('4 services @150 m² = 188,657 (sheet row)', () => assert.equal(one(['FOTO', 'VIDEO', 'REEL', 'PLANO'], 1.15).total, 188657));
t('drone counts toward the discount', () => {
  const r = one(['FOTO', 'VIDEO', 'REEL', 'DRONE']);
  assert.equal(r.serviceCount, 4); assert.equal(r.discount, 11200); assert.equal(r.total, 308800);
});
t('drone only: no base fee, no size scaling', () => assert.equal(one(['DRONE'], 1.5).total, 185000));
t('extras added after the discount, not discounted', () => assert.equal(one(['FOTO', 'VIDEO', 'REEL', 'PLANO'], 1.15, 5000).total, 193657));
t('EXTRAS is not a counted service', () => assert.equal(one(['FOTO', 'VIDEO', 'REEL', 'EXTRAS']).discount, 0));
t('decay = 1 is linear', () => assert.equal(discountPercent(5, k).toFixed(4), '0.0700'));
t('decay 0.8 is geometric', () => assert.equal(discountPercent(5, { ...k, discountDecay: 0.8 }).toFixed(4), (0.035 * 1.8).toFixed(4)));
t('multi-unit: services counted across units, discount split like the sheet', () => {
  const r = computeClientPrice({ units: [{ services: ['FOTO', 'VIDEO'], mult: 1 }, { services: ['FOTO', 'VIDEO'], mult: 1 }], prices, constants: k });
  // each row: base 100,000; 4 services → 3.5% → ROUND(3,500)=3,500 / 2 rows = 1,750
  assert.equal(r.serviceCount, 4); assert.equal(r.discount, 3500); assert.equal(r.total, 196500);
});
t('no cutoff date → old price columns', () => {
  const pd = { pricingConfig: { rule: 'TIMESTAMP', threshold: null }, currentPrices: { FOTO: 35000 }, newPrices: { FOTO: 99 } };
  assert.equal(isNewPriceEra(pd, '2026-11-10'), false); assert.equal(priceTable(pd, false).FOTO, 35000);
});
t('FECHA rule uses the shoot date', () => {
  const pd = { pricingConfig: { rule: 'FECHA', threshold: new Date(2026, 5, 1, 12).getTime() } };
  assert.equal(isNewPriceEra(pd, '2026-05-31'), false); assert.equal(isNewPriceEra(pd, '2026-06-01'), true);
});
t('fallback prices only before the engine loads', () => {
  assert.equal(priceTable(null, false, { FOTO: 1 }).FOTO, 1);
  assert.equal(priceTable({ currentPrices: {} }, false, { FOTO: 1 }).FOTO, 0);
});
console.log(`\n${n} checks passed`);
