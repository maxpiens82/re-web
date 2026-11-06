// Client price, as billed. This mirrors the PRECIO formula that re-backend writes into
// Archivo (Code.js `precioFormula`, formatArchivoSheet). The sheet is the source of truth:
// if that formula changes, change this file the same way. Both the landing page (Home.jsx)
// and the staff form (UnifiedForm.jsx) use it, so they can't drift apart again.
//
// Per unit (one Archivo row; a multi-unit booking is several rows with the same ID):
//   baseMult  = standard services (FOTO VIDEO REEL TH PLANO TOUR) + 30,000 if any of them
//   baseFixed = DRONE + FPV (no size multiplier)
//   base      = baseMult * sizeMultiplier + baseFixed
// Discount (no era switch, removed from the sheet 13 Sep 2026):
//   n      = services across ALL units of the booking, DRONE and FPV included (EXTRAS not)
//   steps  = n - threshold (Valores!Q5)            if n > threshold, else no discount
//   pct    = steps * Q6                             if decay (Q7) = 1
//          = Q6 * (1 - Q7^steps) / (1 - Q7)         otherwise
//   unit discount = ROUND(base * pct)   (each unit gets the whole %; until Nov 2026 the sheet
//                                        also divided it by the number of units, a bug)
// Unit price = base - unit discount + extras.

export const FIXED_SERVICES = ['DRONE', 'FPV'];
export const PRICED_SERVICES = ['FOTO', 'VIDEO', 'REEL', 'TH', 'PLANO', 'TOUR', 'DRONE', 'FPV'];
const BASE_FEE = 30000; // "Tarifa base": deliberate, see re-backend CLAUDE.md

// Sheets works to ~15 significant digits, so 170000 * 1.15 is 195500 there, while in JS it is
// 195499.99999999997 (and 3.5% of it would round down instead of up). Trim that noise first.
const clean = (x) => Math.round(x * 1e6) / 1e6;
// Google Sheets ROUND(x, 0): halves away from zero.
const sheetRound = (x) => { const c = clean(x); return Math.sign(c) * Math.round(Math.abs(c)); };

// Which price columns apply. Same rule as the sheet: no cutoff in Valores!Z2 = old columns.
// Rule FECHA compares the shoot date; TIMESTAMP compares when the booking is made (now).
// `shootDateId` is 'yyyy-mm-dd' or empty.
export function isNewPriceEra(pricingData, shootDateId) {
  const cfg = pricingData && pricingData.pricingConfig;
  if (!cfg || !cfg.threshold) return false;
  let targetMs = Date.now();
  if (cfg.rule === 'FECHA' && shootDateId) {
    const p = String(shootDateId).split('-');
    if (p.length === 3) targetMs = new Date(p[0], p[1] - 1, p[2], 12, 0, 0).getTime();
  }
  return targetMs >= cfg.threshold;
}

export function discountPercent(serviceCount, constants = {}) {
  const threshold = constants.discountThreshold !== undefined ? Number(constants.discountThreshold) : 3;
  const pct = constants.discountPct !== undefined ? Number(constants.discountPct) : 0.035;
  const decay = constants.discountDecay !== undefined ? Number(constants.discountDecay) : 1;
  const steps = serviceCount > threshold ? serviceCount - threshold : 0;
  if (steps === 0) return 0;
  if (decay === 1) return steps * pct;
  return pct * (1 - Math.pow(decay, steps)) / (1 - decay);
}

// units: [{ services: ['FOTO', ...], mult: 1.15, extras: 0 }]
// prices: { FOTO: 35000, ... } for the active era (see priceTable)
export function computeClientPrice({ units, prices, constants }) {
  const list = (units || []).filter(Boolean);
  const serviceCount = list.reduce(
    (n, u) => n + (u.services || []).filter(s => PRICED_SERVICES.includes(s)).length, 0);
  const totalPct = discountPercent(serviceCount, constants || {});

  let total = 0;
  let discount = 0;
  const perUnit = list.map(u => {
    let baseMult = 0;
    let baseFixed = 0;
    let hasStandard = false;
    (u.services || []).forEach(s => {
      if (!PRICED_SERVICES.includes(s)) return;
      const price = Number(prices[s]) || 0;
      if (FIXED_SERVICES.includes(s)) baseFixed += price;
      else { baseMult += price; if (price > 0) hasStandard = true; }
    });
    if (hasStandard) baseMult += BASE_FEE;
    const mult = Number(u.mult) || 1;
    const base = clean(baseMult * mult + baseFixed);
    const unitDiscount = totalPct > 0 ? sheetRound(base * totalPct) : 0;
    const extras = Number(u.extras) || 0;
    const price = base - unitDiscount + extras;
    total += price;
    discount += unitDiscount;
    return { base, discount: unitDiscount, extras, price };
  });

  return { total, discount, serviceCount, perUnit };
}

// The price table for the active era, from init_v2's pricingData. `fallback` (optional) is
// used only for services the engine doesn't have yet (first visit, before the fetch returns).
export function priceTable(pricingData, newEra, fallback = {}) {
  const src = pricingData ? (newEra ? pricingData.newPrices : pricingData.currentPrices) || {} : {};
  const out = {};
  PRICED_SERVICES.forEach(s => {
    if (src[s] !== undefined) out[s] = src[s];
    else if (!pricingData && fallback[s] !== undefined) out[s] = fallback[s];
    else out[s] = 0;
  });
  return out;
}
