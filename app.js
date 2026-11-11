// UI for the calculator: one page, setup (#setup) then the cost (#cost). Needs defaults.js and model.js first.
(function () {
  'use strict';
  const D = window.Defaults;
  const M = window.Model;
  const $ = (id) => document.getElementById(id);
  const money = M.money;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const HORIZONS = [5, 10, 15];

  const params = new URLSearchParams(location.search);
  const state = {
    disciplines: new Set(D.defaultDisciplines),
    agenciesOverride: null, // set when the user edits the agency count directly
    p: D.values(),
    inp: {},
    fit: params.get('fit') || '',
    team: params.get('team') === '1',
    server: false,
    claude: false,
    result: null,
    summaryKey: '',
  };

  // ---------- inputs ----------
  function startingInputs() {
    const o = {};
    for (const [k, v] of Object.entries(D.inputs)) o[k] = v.required ? null : v.value;
    if (params.get('disciplines')) {
      const ids = params.get('disciplines').split(',').filter((id) => D.disciplines.some((d) => d.id === id));
      if (ids.length) state.disciplines = new Set(ids);
    }
    for (const k of ['agencies', 'annualFees', 'coordHours', 'hourlyCost', 'years']) {
      const v = params.get(k);
      if (v != null && v !== '' && !isNaN(Number(v))) o[k] = Number(v);
    }
    if (params.get('agencies')) state.agenciesOverride = o.agencies;
    // Fees come from the marketing budget unless the link gives agency fees directly.
    if (params.get('annualFees')) { state.feeMode = 'actual'; state.feeBasis = o.annualFees; }
    else { state.feeMode = 'budget'; state.feeBasis = o.marketingBudget; o.annualFees = Math.round(o.marketingBudget * D.feeShareOfBudget); }
    return o;
  }

  function inputs() {
    const n = state.agenciesOverride ?? Math.max(1, state.disciplines.size);
    return { ...state.inp, agencies: n, disciplines: [...state.disciplines] };
  }

  function renderDisciplines() {
    $('disciplines').innerHTML = D.disciplines
      .map((d) => `<button type="button" class="practice" data-id="${d.id}" aria-pressed="${state.disciplines.has(d.id)}">
          <span class="practice-name">${esc(d.label)}</span>
          <span class="practice-caps">${(d.capabilities || []).map((c) => `<span>${esc(c)}</span>`).join('')}</span>
        </button>`)
      .join('');
  }
  // ---------- fees: budget, revenue or actual spend ----------
  function setFeesFromBasis() {
    const m = D.feeModes[state.feeMode];
    state.inp.annualFees = state.feeBasis > 0 ? Math.round(state.feeBasis * m.factor) : null;
  }
  function renderFee() {
    const m = D.feeModes[state.feeMode];
    $('fee-label').textContent = m.label;
    $('feeBasis').value = state.feeBasis > 0 ? Math.round(state.feeBasis).toLocaleString('en-US') : '';
    $('fee-modes').innerHTML = Object.entries(D.feeModes)
      .filter(([k]) => k !== state.feeMode)
      .map(([k, x]) => `<button type="button" class="linkbtn" data-mode="${k}">${esc(x.link)}</button>`)
      .join('');
    renderFeeDerived();
  }
  function renderFeeDerived() {
    const m = D.feeModes[state.feeMode];
    $('fee-derived').textContent = m.derived && state.inp.annualFees > 0
      ? `≈ ${money(state.inp.annualFees)} a year in agency fees: ${m.derived}`
      : '';
  }

  // ---------- team involvement ----------
  function renderInvolvement() {
    const h = state.inp.coordHours;
    const opts = D.involvement.slice();
    if (!opts.some((o) => o.hours === h)) opts.push({ id: 'custom', label: 'Custom', hours: h, text: 'From your link' });
    $('involvement').innerHTML = opts
      .map((o) => `<button type="button" class="choice" data-hours="${o.hours}" aria-pressed="${o.hours === h}">
          <span class="choice-name">${esc(o.label)} <b>${o.hours} h</b></span><span class="choice-text">${esc(o.text)}</span></button>`)
      .join('');
  }

  function renderHorizons() {
    const y = state.inp.years;
    const opts = HORIZONS.includes(y) ? HORIZONS : [...HORIZONS, y].sort((a, b) => a - b);
    $('horizons').innerHTML = opts
      .map((h) => `<button type="button" class="pill" data-years="${h}" aria-pressed="${h === y}">${h} years</button>`)
      .join('');
  }

  // ---------- "what this rests on" ----------
  function fmtParam(p, v) {
    if (p.unit === '$') return money(v);
    if (p.unit === 'share') return Math.round(v * 100) + '%';
    return `${v} ${p.unit}`;
  }
  function paramRow({ key, label, kind, value, unit, note, anchor }) {
    return `<label class="param">
      <span class="param-name">${esc(label)}<span class="kind">${kind}</span></span>
      <span class="param-input"><span class="pre">${unit === '$' ? '$' : ''}</span><input type="number" step="any" data-key="${key}" value="${value}"><span class="u">${unit && unit !== '$' ? esc(unit === 'years' ? 'yrs' : unit) : ''}</span></span>
      ${note ? `<small>${esc(note)} <a href="methodology.html#${anchor || key}">Source</a></small>` : ''}
    </label>`;
  }
  function renderRests() {
    $('tenure').innerHTML = D.disciplines
      .filter((d) => state.disciplines.has(d.id))
      .map((d) => paramRow({ key: 'tenure.' + d.id, label: d.label, kind: d.kind, value: state.p.tenure[d.id], unit: 'yrs', anchor: 'tenure' }))
      .join('') || '<p class="note">Tick a discipline on step 1.</p>';
    const r = state.result || M.compute(inputs(), state.p);
    $('setup-params').innerHTML = [
      paramRow({ key: 'in.agencies', label: 'Specialist agencies', kind: D.inputs.agencies.kind, value: r.agencies, unit: '', anchor: 'inputs' }),
      paramRow({ key: 'in.hourlyCost', label: 'Loaded hourly cost', kind: D.inputs.hourlyCost.kind, value: state.inp.hourlyCost, unit: '$', anchor: 'inputs' }),
      paramRow({ key: 'in.years', label: 'Time horizon', kind: 'input', value: state.inp.years, unit: 'yrs', anchor: 'inputs' }),
    ].join('');
    $('params').innerHTML = D.params
      .map((p) => {
        const share = p.unit === 'share';
        return paramRow({ key: p.key, label: p.label, kind: p.kind, value: share ? Math.round(state.p[p.key] * 100) : state.p[p.key], unit: share ? '%' : p.unit });
      })
      .join('');
  }
  function onParam(e) {
    const t = e.target;
    if (!t.dataset.key) return;
    const v = Number(t.value);
    if (!isFinite(v) || t.value === '') return;
    const key = t.dataset.key;
    if (key.startsWith('tenure.')) state.p.tenure[key.slice(7)] = v > 0 ? v : state.p.tenureFallback;
    else if (key === 'in.agencies') state.agenciesOverride = Math.max(1, Math.round(v));
    else if (key === 'in.years') { state.inp.years = Math.max(1, Math.min(30, v)); renderHorizons(); }
    else if (key.startsWith('in.')) state.inp[key.slice(3)] = Math.max(0, v);
    else {
      const p = D.params.find((x) => x.key === key);
      state.p[key] = p.unit === 'share' ? v / 100 : v;
    }
    update(false);
  }

  // ---------- results ----------
  // Each cost line with the arithmetic behind it, so every number can be traced in Q&A.
  function costLines(r) {
    const p = state.p, inp = inputs();
    const N = r.agencies, H = r.years, h = inp.coordHours, rate = money(inp.hourlyCost);
    const pairs = (N * (N - 1)) / 2;
    const f1 = (x) => (Math.round(x * 10) / 10).toString();
    const f2 = (x) => (Math.round(x * 100) / 100).toString();
    const rps = p.reviewsPerSwitch !== 1 ? ` × ${p.reviewsPerSwitch} reviews` : '';
    const net = (1 - (p.dupWork || 0)) * (1 + p.integratedFeeDiff) - 1;
    const feeWhy = (p.dupWork || 0) > 0
      ? `${money(inp.annualFees)} × ${H} yrs × ${pctSigned(net)} net (premium ${pctSigned(p.integratedFeeDiff)}, duplicated work −${pct1(p.dupWork)})`
      : `${money(inp.annualFees)} a year × ${H} yrs × ${pctSigned(p.integratedFeeDiff)}`;
    return [
      { id: 'reviews', label: 'Agency reviews',
        why: `${N} × (${H} ÷ ${f2(r.tenureS)} yrs) = ${f1(r.switchesS)} vs ${H} ÷ ${f2(r.tenureI)} = ${f1(r.switchesI)} switches${rps} × ${money(p.reviewCost)}` },
      { id: 'coordination', label: 'Coordination time',
        why: `(${N} × ${h} h${pairs ? ` + ${pairs} pair${pairs > 1 ? 's' : ''} × ${p.handoffHours} h` : ''}) vs ${p.integratedCoordFactor} × ${h} h, a month × 12 × ${H} yrs × ${rate}` },
      { id: 'transition', label: 'Handover overlap',
        why: `${f1(r.switchesS)} vs ${f1(r.switchesI)} switches × ${money(p.overlapCost)} × ${pct1(p.overlapShare)}` },
      { id: 'fees', label: 'Fee premium', why: feeWhy },
    ].map((x) => ({ ...x, line: r.lines.find((l) => l.id === x.id) }))
      .filter((x) => x.id !== 'fees' || x.line.diff !== 0);
  }
  const pctSigned = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x * 1000) / 10) + '%';
  const pct1 = (x) => Math.round(x * 1000) / 10 + '%';
  function breakEvenRow(r) {
    if (r.breakEven == null) return '';
    const txt = r.breakEven > 0 ? `${pct1(r.breakEven)}` : '0%';
    return `<div class="stat stat-break"><span class="stat-num">${txt}</span><span class="stat-cap">Fee premium at which one partner stops being cheaper</span></div>`;
  }
  const agencyWord = (n) => (n === 1 ? '1 specialist' : `${n} specialists`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function headlineHtml(r) {
    return r.gap >= 0
      ? `${cap(agencyWord(r.agencies))} cost about <em>${money(r.gap)} more</em> than one integrated partner.`
      : `One integrated partner costs about <em>${money(-r.gap)} more</em> than ${agencyWord(r.agencies)}.`;
  }

  function statRows(lines, why) {
    return lines
      .map((x) => `<div class="stat"><span class="stat-num">${money(x.line.diff)}</span><span class="stat-cap">${why ? `<b>${esc(x.label)}</b><span>${esc(x.why)}</span>` : esc(x.label)}</span></div>`)
      .join('');
  }

  function barsHtml(r) {
    const fl = r.lines.find((l) => l.id === 'fees');
    const extra = { s: Math.max(0, fl.s - fl.i), i: Math.max(0, fl.i - fl.s) };
    const tot = { s: r.hiddenS + extra.s, i: r.hiddenI + extra.i };
    const max = Math.max(tot.s, tot.i, 1);
    const seg = (id, k) => {
      const l = r.lines.find((x) => x.id === id);
      return `<i style="width:${((l[k] / max) * 100).toFixed(2)}%;background:var(--c-${id})" title="${esc(l.label)}: ${money(l[k])}"></i>`;
    };
    const feeSeg = (k) => (extra[k] > 0 ? `<i style="width:${((extra[k] / max) * 100).toFixed(2)}%;background:var(--c-fees)" title="Fee premium: ${money(extra[k])}"></i>` : '');
    return [['Specialists', 's'], ['One integrated partner', 'i']]
      .map(([name, k]) => `<div class="bar-row"><div class="bar-head"><span>${name}</span><b>${money(tot[k])}</b></div>
        <div class="bar-track">${seg('reviews', k)}${seg('transition', k)}${seg('coordination', k)}${feeSeg(k)}</div></div>`)
      .join('');
  }

  function tracksHtml(r) {
    const marks = (sp) => {
      let out = '';
      for (let t = sp; t <= r.years + 1e-9; t += sp) out += `<i style="left:${((t / r.years) * 100).toFixed(2)}%" title="Around year ${t.toFixed(1)}"></i>`;
      return out;
    };
    return [['Specialists', r.spacingS, r.switchesS], ['One partner', r.spacingI, r.switchesI]]
      .map(([name, sp, n]) => `<div class="track"><span class="track-name">${name}</span><div class="track-line">${marks(sp)}</div><span class="track-count">${n.toFixed(1)}</span></div>`)
      .join('');
  }

  function renderTable(r) {
    $('table').querySelector('tbody').innerHTML = r.lines
      .map((l) => `<tr><th>${l.label}</th><td>${money(l.s)}</td><td>${money(l.i)}</td><td>${l.diff === 0 ? '$0' : money(l.diff)}</td></tr>`)
      .join('');
    $('table').querySelector('tfoot').innerHTML = `<tr><th>Total over ${r.years} years, with fees</th><td>${money(r.totalS)}</td><td>${money(r.totalI)}</td><td>${money(r.gap)}</td></tr>`;
  }

  // ---------- summary, talking points, case ----------
  function facts(r) {
    const inp = inputs();
    const labels = [...state.disciplines].map((id) => D.disciplines.find((d) => d.id === id).label);
    const f = [
      `Digitas practices the problem touches: ${labels.join(', ') || 'none ticked'}`,
      `Specialist agencies: ${r.agencies}`,
      `Time horizon: ${r.years} years`,
      `Annual agency fees, all agencies: ${money(inp.annualFees)}${state.feeMode === 'budget' ? ` (from a ${money(state.feeBasis)} marketing budget x 20.7%)` : state.feeMode === 'revenue' ? ` (from ${money(state.feeBasis)} revenue x 1.59%)` : ''}`,
      `Client coordination hours per agency per month: ${inp.coordHours}`,
      `Loaded hourly cost: ${money(inp.hourlyCost)}`,
      r.gap >= 0
        ? `Result: the specialists cost about ${money(r.gap)} more than one integrated partner over the horizon (totals: specialists ${money(r.totalS)}, integrated partner ${money(r.totalI)})`
        : `Result: one integrated partner costs about ${money(-r.gap)} more than the specialists over the horizon (totals: specialists ${money(r.totalS)}, integrated partner ${money(r.totalI)})`,
      `Costs on top of fees: specialists ${money(r.hiddenS)}, integrated partner ${money(r.hiddenI)}`,
      `Fee premium at which one integrated partner stops being cheaper: ${r.breakEven == null ? 'not applicable' : pct1(Math.max(0, r.breakEven))}`,
      `Expected agency switches: specialists ${r.switchesS.toFixed(1)}, integrated partner ${r.switchesI.toFixed(1)}`,
      `Average tenure: specialists ${r.tenureS.toFixed(1)} years (industry average from an ANA survey of client marketers, by discipline), integrated partner ${r.tenureI.toFixed(1)} years`,
    ];
    for (const d of D.disciplines.filter((x) => state.disciplines.has(x.id))) f.push(`Capabilities in ${d.label}: ${d.capabilities.join(', ')}`);
    for (const l of r.lines) f.push(`${l.label}: specialists ${money(l.s)}, integrated partner ${money(l.i)}, difference ${money(l.diff)}`);
    for (const p of D.params) f.push(`Assumption (${p.kind}): ${p.label} = ${fmtParam(p, state.p[p.key])}`);
    return f;
  }

  function relevantCases() {
    const picked = [...state.disciplines];
    return D.cases
      .map((c, i) => ({ c, i, score: (c.tags || []).filter((t) => picked.includes(t)).length + (c.image ? 0.5 : 0) }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 4)
      .map((x) => x.c);
  }

  function templateSummary(r) {
    const lines = costLines(r).filter((x) => x.id !== 'fees').sort((a, b) => b.line.diff - a.line.diff);
    const n = agencyWord(r.agencies);
    const prem = pctSigned(state.p.integratedFeeDiff);
    const be = r.breakEven == null ? '' : ` One partner stays cheaper while its fee premium is under ${pct1(Math.max(0, r.breakEven))}.`;
    if (r.gap <= 0) {
      return `With fees ${prem} for one integrated partner, it would cost about ${money(-r.gap)} more than ${n} over ${r.years} years.` + be +
        ` If the problem sits in one practice, a specialist may be the better fit.`;
    }
    return `Over ${r.years} years, ${n} would cost you about ${money(r.gap)} more than one integrated partner` +
      (state.p.integratedFeeDiff > 0 ? `, even with the partner's fees ${prem}. ` : '. ') +
      `The largest part is ${lines[0].label.toLowerCase()} (${money(lines[0].line.diff)}).` + be;
  }

  function templatePoints(r) {
    const labels = [...state.disciplines].map((id) => D.disciplines.find((d) => d.id === id).label);
    return [
      `Ask how often they have actually switched or re-pitched agencies, and compare with the ${r.switchesS.toFixed(1)} expected switches here.`,
      'Verify what a review costs them in internal time; it drives the largest line.',
      `Find where the work crosses ${labels.join(', ') || 'disciplines'} today. Make that the case, not the number of services.`,
      'Bring a lead from each ticked practice and one case that matches the problem.',
    ];
  }

  function renderSummary(r) {
    const key = JSON.stringify([inputs(), state.p, state.fit]);
    if (key === state.summaryKey) return;
    state.summaryKey = key;
    $('summary-text').textContent = templateSummary(r);
    $('talking-points').innerHTML = templatePoints(r).map((t) => `<li>${esc(t)}</li>`).join('');
    if (state.claude) {
      clearTimeout(state.genTimer);
      state.genTimer = setTimeout(() => generate(key), 1200);
    }
  }

  // Claude rewrites the summary on its own once the inputs stop changing; stale replies are dropped.
  async function generate(key) {
    const r = state.result;
    const cases = relevantCases();
    try {
      const res = await fetch('api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facts: facts(r), cases, fit: state.fit }),
      });
      const d = await res.json();
      if (!res.ok || key !== state.summaryKey) return;
      $('summary-text').textContent = d.summary;
      $('talking-points').innerHTML = d.talking_points.map((t) => `<li>${esc(t)}</li>`).join('');
    } catch {
      /* keep the template summary */
    }
  }

  // ---------- print sheet ----------
  function renderSheet(r) {
    const labels = [...state.disciplines].map((id) => D.disciplines.find((d) => d.id === id).label);
    const rows = [
      ['Specialist tenure, these disciplines', `${r.tenureS.toFixed(1)} yrs`],
      ['Integrated partner tenure', `${r.tenureI} yrs`],
      ['Client cost of one review', '$' + Math.round(state.p.reviewCost).toLocaleString('en-US')],
      [`Handover overlap, ${Math.round(state.p.overlapShare * 100)}% of switches`, '$' + Math.round(state.p.overlapCost).toLocaleString('en-US')],
      ['Loaded hourly cost', money(state.inp.hourlyCost)],
      ["Integrated partner's fee premium", pctSigned(state.p.integratedFeeDiff)],
      ...((state.p.dupWork || 0) > 0 ? [["Duplicated work in specialists' fees", pct1(state.p.dupWork)]] : []),
      ['Break-even fee premium', r.breakEven == null ? 'n/a' : pct1(Math.max(0, r.breakEven))],
    ];
    $('sheet').innerHTML = `
      <div class="sheet-head"><span>Integration<br>cost estimate</span><img src="assets/digitas-logo-white.png" alt=""><span style="text-align:right">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      <div class="sheet-band"><span class="tag">Estimated · ${r.years} years · ${esc(labels.join(', '))}</span><h1>${headlineHtml(r)}</h1></div>
      <div class="sheet-body">
        <div class="card split">
          <div class="pane pane-dark"><p class="eyebrow">Where the gap comes from</p><h2>${state.p.integratedFeeDiff > 0 ? 'Higher fees, fewer hidden costs.' : 'Not from fees. From everything around them.'}</h2>
            <div class="stats-why">${statRows(costLines(r), true)}</div></div>
          <div class="pane pane-ivory"><p class="eyebrow">Costs beyond base fees</p>${barsHtml(r)}
            <div class="legend"><span><i class="sw sw-reviews"></i>Reviews</span><span><i class="sw sw-transition"></i>Handover</span><span><i class="sw sw-coordination"></i>Coordination</span><span><i class="sw sw-fees"></i>Fee premium</span></div></div>
        </div>
        <div class="card pane-dark" style="padding:18px 22px"><p class="eyebrow">What this means</p><p class="sheet-summary">${esc($('summary-text').textContent)}</p></div>
        <div class="sheet-row">
          <div class="card pane-dark"><p class="eyebrow">What this rests on</p><table>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table></div>
        </div>
      </div>
      <div class="sheet-foot">Sources: ANA and 4As, The Cost of the Pitch (2023); ANA and 4As, Client-Agency AOR Relationship Tenure (2025, client-reported); BLS OEWS May 2025 and ECEC June 2026. Student prototype, BUS 365, Emory University. Not an official Digitas tool.</div>`;
  }

  // ---------- sources ----------
  function renderSources() {
    $('sources-list').innerHTML = Object.values(D.sources)
      .map((x) => `<li>${esc(x.apa)}${x.url ? ` <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : ''}</li>`)
      .join('');
  }

  // ---------- past cases ----------
  // Public Digitas cases that share the most practices with the ones ticked.
  function renderMatch() {
    const cases = relevantCases();
    $('match').innerHTML = `
      <h2>Past cases</h2>
      <div class="match-cases">${cases.map((c) => `
        <a class="match-case" href="${esc(c.url)}" target="_blank" rel="noopener">
          <span class="img" ${c.image ? `style="background-image:url('${esc(c.image)}')"` : ''}></span>
          <span class="body"><span class="client">${esc(c.client)}</span><span class="title" style="display:block">${esc(c.title)}</span><span class="result">${esc(c.result)}</span></span>
        </a>`).join('')}</div>`;
  }

  // ---------- main ----------
  // Fees and team hours are required: show nothing until both are entered.
  const ready = () => state.inp.annualFees > 0;

  function update(rerenderRests = true) {
    const ok = ready();
    $('cost').hidden = !ok;
    $('see-breakdown').setAttribute('aria-disabled', String(!ok));
    if (!ok) {
      $('live-lede').textContent = 'Enter an amount above to see the estimate.';
      $('live-gap').textContent = '';
      $('live-lines').innerHTML = '';
      return;
    }
    const r = M.compute(inputs(), state.p);
    state.result = r;
    document.querySelectorAll('.agency-word').forEach((e) => (e.textContent = agencyWord(r.agencies)));
    document.querySelectorAll('.years-word').forEach((e) => (e.textContent = `${r.years} years`));
    $('live-lede').textContent = r.gap >= 0
      ? `Extra cost of ${agencyWord(r.agencies)} over ${r.years} years`
      : `Extra cost of one integrated partner over ${r.years} years`;
    $('live-gap').textContent = money(Math.abs(r.gap));
    $('live-lines').innerHTML = statRows(costLines(r), false) + breakEvenRow(r);
    $('cost-tag').textContent = `Estimated · ${r.years} years` + (state.p.integratedFeeDiff ? ` · partner fees ${pctSigned(state.p.integratedFeeDiff)}` : '');
    $('cost-h2').textContent = state.p.integratedFeeDiff > 0 ? 'Higher fees, fewer hidden costs.' : 'Not from fees. From everything around them.';
    $('cost-headline').innerHTML = headlineHtml(r);
    $('picked-tags').innerHTML = [...state.disciplines].map((id) => `<span>${esc(D.disciplines.find((d) => d.id === id).label)}</span>`).join('');
    $('cost-lines').innerHTML = statRows(costLines(r), true) + breakEvenRow(r);
    $('bars').innerHTML = barsHtml(r);
    $('legend-fees').hidden = r.lines.find((l) => l.id === 'fees').diff === 0;
    $('tracks').innerHTML = tracksHtml(r);
    renderTable(r);
    if (rerenderRests) renderRests();
    renderSummary(r);
    renderMatch();
  }

  function setTeam(on) {
    state.team = on;
    $('team').hidden = !on;
    $('team-toggle').textContent = on ? 'Client view' : 'Team view';
  }

  function init() {
    state.inp = startingInputs();
    renderFee();
    renderInvolvement();
    renderDisciplines();
    renderHorizons();

    $('disciplines').addEventListener('click', (e) => {
      const b = e.target.closest('.practice');
      if (!b) return;
      const id = b.dataset.id;
      if (state.disciplines.has(id)) state.disciplines.delete(id);
      else state.disciplines.add(id);
      b.setAttribute('aria-pressed', state.disciplines.has(id));
      state.agenciesOverride = null;
      update();
    });
    $('horizons').addEventListener('click', (e) => {
      const b = e.target.closest('.pill');
      if (!b) return;
      state.inp.years = Number(b.dataset.years);
      renderHorizons();
      update();
    });
    $('feeBasis').addEventListener('input', (e) => {
      const n = Number(e.target.value.replace(/[^\d]/g, ''));
      e.target.value = n ? n.toLocaleString('en-US') : '';
      state.feeBasis = n || null;
      setFeesFromBasis();
      renderFeeDerived();
      update();
    });
    $('fee-modes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      const fees = state.inp.annualFees;
      state.feeMode = b.dataset.mode;
      const f = D.feeModes[state.feeMode].factor;
      state.feeBasis = fees > 0 ? Math.round(fees / f / 1000) * 1000 : null;
      setFeesFromBasis();
      renderFee();
      $('feeBasis').focus();
      update();
    });
    $('involvement').addEventListener('click', (e) => {
      const b = e.target.closest('.choice');
      if (!b) return;
      state.inp.coordHours = Number(b.dataset.hours);
      renderInvolvement();
      update();
    });
    ['tenure', 'setup-params', 'params'].forEach((id) => $(id).addEventListener('input', onParam));
    $('rests-toggle').onclick = () => {
      const open = $('rests-body').hidden;
      $('rests-body').hidden = !open;
      $('rests-toggle').setAttribute('aria-expanded', open);
      $('rests-label').textContent = open ? 'Hide' : 'Show';
    };
    $('reset').onclick = () => {
      state.p = D.values();
      state.agenciesOverride = null;
      state.inp.hourlyCost = D.inputs.hourlyCost.value;
      update();
    };
    $('print').onclick = () => { renderSheet(state.result); window.print(); };
    $('team-toggle').onclick = (e) => { e.preventDefault(); setTeam(!state.team); };
    window.addEventListener('beforeprint', () => renderSheet(state.result));

    setTeam(state.team);
    renderSources();
    update();

    // Only the local server (python3 server.py) has the Claude summary; skip the check on GitHub Pages.
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      fetch('api/health')
        .then((r) => r.json())
        .then((d) => {
          state.server = true;
          state.claude = !!d.claude;
          // "What this means for you" needs Claude, so it only shows when the local server has it.
          $('summary').hidden = !d.claude;
          state.summaryKey = '';
          renderSummary(state.result);
        })
        .catch(() => {});
    }
  }

  init();
})();
