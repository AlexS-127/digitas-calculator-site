(function () {
  'use strict';
  const D = window.Defaults;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ids = Object.keys(D.sources);
  const ref = (id) => (id && D.sources[id] ? `<a href="#src-${id}">[${ids.indexOf(id) + 1}]</a>` : '');
  const fmt = (p, v) => (p.unit === '$' ? '$' + Number(v).toLocaleString('en-US') : p.unit === 'share' ? Math.round(v * 100) + '%' : `${v} ${p.unit || ''}`);

  document.getElementById('params').innerHTML = D.params
    .map(
      (p) => `<div class="def" id="${p.key}">
        <h3>${esc(p.label)} <em class="kind kind-${p.kind}">${p.kind}</em></h3>
        <p class="def-value">${fmt(p, p.value)} <span class="meta">range ${fmt(p, p.low)} to ${fmt(p, p.high)}</span> ${ref(p.source)}</p>
        <p>${esc(p.note)}</p>
      </div>`
    )
    .join('');

  document.getElementById('tenure-list').innerHTML = D.disciplines
    .map((d) => `<div class="def"><h3>${esc(d.label)} <em class="kind kind-${d.kind}">${d.kind}</em></h3>
      <p class="def-value">${d.tenure} years ${ref('tenure2025')}</p><p>${esc(d.note)}</p></div>`)
    .join('');

  const names = { marketingBudget: 'Annual marketing budget', agencies: 'Specialist agencies', annualFees: 'Annual agency fees', coordHours: 'Coordination hours per agency per month', hourlyCost: 'Loaded hourly cost', years: 'Time horizon' };
  document.getElementById('inputs').innerHTML = Object.entries(D.inputs)
    .map(([k, v]) => `<div class="def"><h3>${names[k]} <em class="kind kind-${v.kind}">${v.kind}</em></h3>
      <p class="def-value">${v.required ? 'Required input' : (['annualFees', 'hourlyCost', 'marketingBudget'].includes(k) ? '$' + v.value.toLocaleString('en-US') : v.value)} ${ref(v.source)}</p><p>${esc(v.note)}</p></div>`)
    .join('');

  document.getElementById('sources').innerHTML = ids
    .map((id) => {
      const s = D.sources[id];
      return `<li id="src-${id}">${esc(s.apa)} ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : ''}</li>`;
    })
    .join('');
})();
