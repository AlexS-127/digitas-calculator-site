// Cost model: N specialist agencies vs one integrated partner over a horizon.
// Pure functions, no DOM. Loaded as a classic script (window.Model) and by Node tests.
(function (root) {
  'use strict';

  // Average annual switch rate across the ticked disciplines: mean of 1 / tenure.
  // A relationship lasting T years on average ends at a rate of 1/T per year (steady state).
  function specialistRate(disciplines, tenureBy, fallback) {
    const ts = (disciplines || []).map((id) => tenureBy[id] ?? fallback).filter((t) => t > 0);
    if (!ts.length) return 1 / fallback;
    return ts.reduce((a, t) => a + 1 / t, 0) / ts.length;
  }

  // inputs: { disciplines: [ids], agencies, annualFees, coordHours, hourlyCost, years }
  //   coordHours = client hours per agency per month spent coordinating
  // d: research values (defaults.js values()): tenure map, costs, factors
  function compute(inputs, d) {
    const N = Math.max(1, Math.round(inputs.agencies));
    const H = Math.max(1, inputs.years);
    const fees = Math.max(0, inputs.annualFees);

    const rateS = specialistRate(inputs.disciplines, d.tenure, d.tenureFallback);
    const rateI = 1 / d.tenureIntegrated;
    const switchesS = N * H * rateS;
    const switchesI = H * rateI;
    // Reviews per switch: 1 = only the review that ends the relationship.
    const reviewsS = switchesS * d.reviewsPerSwitch;
    const reviewsI = switchesI * d.reviewsPerSwitch;
    const overlap = d.overlapCost * d.overlapShare; // expected handover cost per switch

    const pairs = (N * (N - 1)) / 2;
    const coordS = (N * inputs.coordHours + pairs * d.handoffHours) * 12 * H * inputs.hourlyCost;
    const coordI = d.integratedCoordFactor * inputs.coordHours * 12 * H * inputs.hourlyCost;

    const lines = [
      { id: 'reviews', label: 'Agency reviews', s: reviewsS * d.reviewCost, i: reviewsI * d.reviewCost },
      { id: 'transition', label: 'Handover overlap', s: switchesS * overlap, i: switchesI * overlap },
      { id: 'coordination', label: 'Coordination time', s: coordS, i: coordI },
      // Integrated fees: specialists' fees minus duplicated work, plus the partner's premium.
      { id: 'fees', label: 'Agency fees', s: fees * H, i: fees * (1 - (d.dupWork || 0)) * (1 + d.integratedFeeDiff) * H },
    ];
    for (const l of lines) l.diff = l.s - l.i;

    const sum = (k, f) => lines.filter(f).reduce((a, l) => a + l[k], 0);
    const all = () => true;
    const notFees = (l) => l.id !== 'fees';

    return {
      agencies: N,
      years: H,
      tenureS: 1 / rateS, // effective specialist tenure for the ticked disciplines
      tenureI: d.tenureIntegrated,
      switchesS,
      switchesI,
      reviewsS,
      reviewsI,
      lines,
      totalS: sum('s', all),
      totalI: sum('i', all),
      gap: sum('s', all) - sum('i', all),
      hiddenS: sum('s', notFees), // costs on top of fees
      hiddenI: sum('i', notFees),
      // Fee premium at which one integrated partner stops being cheaper (share of fees).
      breakEven: fees > 0
        ? (sum('s', notFees) - sum('i', notFees) + fees * H) / (fees * (1 - (d.dupWork || 0)) * H) - 1
        : null,
      // Average spacing between switches across the whole roster (years).
      spacingS: 1 / (N * rateS),
      spacingI: 1 / rateI,
    };
  }

  // Format dollars for display: $408K, $3.31M, $1.20B.
  function money(x, digits) {
    const a = Math.abs(x);
    const sign = x < 0 ? '-' : '';
    if (a >= 1e9) return sign + '$' + (a / 1e9).toFixed(digits ?? 2) + 'B';
    if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(digits ?? 2) + 'M';
    if (a >= 1e4) return sign + '$' + (a / 1e3).toFixed(digits ?? 0) + 'K';
    return sign + '$' + Math.round(a).toLocaleString('en-US');
  }

  const M = { compute, specialistRate, money };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.Model = M;
})(typeof window !== 'undefined' ? window : globalThis);
