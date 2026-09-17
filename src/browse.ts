import { CASES } from './fixtures/cases';
import { CATEGORY_LABELS, type Category, type EvalCase, type Verdict } from './rubric';
import { analyzeCase } from './engine';
import { escapeHtml, renderScores } from './shared';

function renderAutomatedCheck(evalCase: EvalCase): string {
  const analysis = analyzeCase(evalCase);
  if (!analysis.automated.ran) return '';
  const rows = analysis.automated.claims
    .map((claim) => {
      const status = claim.matches ? 'ok' : 'bad';
      return `
        <div class="claim-row ${status}">
          <span>${escapeHtml(claim.claimText)}</span>
          <span class="status">${claim.matches ? '✓ verified' : `✗ actual: ${claim.actualValue.toFixed(2)}`}</span>
        </div>
      `;
    })
    .join('');
  return `
    <div class="automated-check">
      <div class="ac-title">Automated arithmetic check (parsed, not eyeballed)</div>
      ${rows || '<div style="font-size:12px;color:var(--dim2)">No parseable "expression = value" claims found.</div>'}
    </div>
  `;
}

function renderCase(evalCase: EvalCase): string {
  const isPairwise = evalCase.category === 'pairwise';

  const responseSection = isPairwise
    ? `
      <div class="field">
        <div class="field-label">Responses under comparison</div>
        <div class="pair-grid">
          <div class="pair-col">
            <div class="field-label">Response A ${evalCase.pairwiseWinner === 'A' ? '<span class="winner-tag">stronger</span>' : ''}</div>
            <div class="field-content">${escapeHtml(evalCase.response)}</div>
          </div>
          <div class="pair-col">
            <div class="field-label">Response B ${evalCase.pairwiseWinner === 'B' ? '<span class="winner-tag">stronger</span>' : ''}</div>
            <div class="field-content">${escapeHtml(evalCase.responseB ?? '')}</div>
          </div>
        </div>
      </div>
    `
    : `
      <div class="field">
        <div class="field-label">Response under evaluation</div>
        <div class="field-content">${escapeHtml(evalCase.response)}</div>
      </div>
    `;

  const issuesSection = evalCase.expert.issues.length
    ? evalCase.expert.issues
        .map(
          (issue) => `
        <div class="issue">
          <div class="issue-type">${escapeHtml(issue.type)}</div>
          <div>${escapeHtml(issue.description)}</div>
        </div>
      `,
        )
        .join('')
    : '';

  return `
    <div class="case-card" data-id="${evalCase.id}">
      <div class="case-header">
        <span class="case-id">${evalCase.id}</span>
        <span class="case-title">${escapeHtml(evalCase.title)}</span>
        <span class="verdict-badge pending" data-badge>PENDING</span>
        <span class="chevron">▸</span>
      </div>
      <div class="case-body">
        <div class="field">
          <div class="field-label">Prompt</div>
          <div class="field-content prompt">${escapeHtml(evalCase.prompt)}</div>
        </div>
        ${responseSection}
        ${renderAutomatedCheck(evalCase)}
        <div class="field">
          <div class="field-label">Rubric scores</div>
          ${renderScores(evalCase.expert.scores)}
        </div>
        ${issuesSection ? `<div class="field"><div class="field-label">Flagged issues</div>${issuesSection}</div>` : ''}
        <div class="field">
          <div class="field-label">Expert rationale</div>
          <div class="rationale">${escapeHtml(evalCase.expert.rationale)}</div>
        </div>
      </div>
    </div>
  `;
}

const categories = Array.from(new Set(CASES.map((c) => c.category))) as Category[];
let activeFilter: Category | 'all' = 'all';

function visibleCases(): EvalCase[] {
  return activeFilter === 'all' ? CASES : CASES.filter((c) => c.category === activeFilter);
}

function renderCaseList(): string {
  const filtered = visibleCases();
  const grouped = new Map<Category, EvalCase[]>();
  for (const c of filtered) {
    if (!grouped.has(c.category)) grouped.set(c.category, []);
    grouped.get(c.category)!.push(c);
  }
  let html = '';
  for (const [category, cases] of grouped) {
    html += `<div class="category-heading">${CATEGORY_LABELS[category]}</div>`;
    html += `<div class="case-list">${cases.map(renderCase).join('')}</div>`;
  }
  return html;
}

function renderFilters(): string {
  const all = `<button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All (${CASES.length})</button>`;
  const rest = categories
    .map((cat) => {
      const count = CASES.filter((c) => c.category === cat).length;
      return `<button class="filter-btn ${activeFilter === cat ? 'active' : ''}" data-filter="${cat}">${CATEGORY_LABELS[cat]} (${count})</button>`;
    })
    .join('');
  return `<div class="filters">${all}${rest}</div>`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let running = false;

async function runSuite(container: HTMLElement) {
  if (running) return;
  running = true;

  const runBtn = document.getElementById('run-suite-btn') as HTMLButtonElement;
  const liveStats = document.getElementById('live-stats')!;
  runBtn.disabled = true;
  runBtn.textContent = '⏸ Running…';

  let pass = 0;
  let fail = 0;
  let partial = 0;

  const ordered = visibleCases();
  for (const evalCase of ordered) {
    const card = container.querySelector(`.case-card[data-id="${evalCase.id}"]`);
    if (!card) continue;
    const badge = card.querySelector('[data-badge]')!;
    const verdict: Verdict = evalCase.expert.verdict;
    badge.textContent = verdict;
    badge.className = `verdict-badge ${verdict}`;
    card.classList.add('just-revealed');

    if (verdict === 'pass') pass++;
    else if (verdict === 'fail') fail++;
    else partial++;

    liveStats.innerHTML = `
      <div class="summary-cell"><div class="k">Evaluated</div><div class="v">${pass + fail + partial}/${ordered.length}</div></div>
      <div class="summary-cell"><div class="k">Pass</div><div class="v pass-text">${pass}</div></div>
      <div class="summary-cell"><div class="k">Fail / partial</div><div class="v fail-text">${fail + partial}</div></div>
      <div class="summary-cell"><div class="k">Automated checks run</div><div class="v">${ordered.filter((c) => c.verification === 'automated').length}</div></div>
    `;

    await delay(140);
    card.classList.remove('just-revealed');
  }

  runBtn.disabled = false;
  runBtn.textContent = '↻ Re-run evaluation suite';
  running = false;
}

export function renderBrowse(container: HTMLElement) {
  container.innerHTML = `
    <div class="run-bar">
      <button id="run-suite-btn" class="btn-primary">▶ Run evaluation suite (${CASES.length} cases)</button>
      <span class="run-hint">Runs every case through the rubric + automated checker live, in order — click a case afterward to see the full evaluation.</span>
    </div>
    <div class="summary" id="live-stats">
      <div class="summary-cell"><div class="k">Evaluated</div><div class="v">0/${CASES.length}</div></div>
      <div class="summary-cell"><div class="k">Pass</div><div class="v">—</div></div>
      <div class="summary-cell"><div class="k">Fail / partial</div><div class="v">—</div></div>
      <div class="summary-cell"><div class="k">Automated checks run</div><div class="v">—</div></div>
    </div>
    <div id="filters"></div>
    <div id="case-list"></div>
  `;
  document.getElementById('filters')!.innerHTML = renderFilters();
  document.getElementById('case-list')!.innerHTML = renderCaseList();

  document.getElementById('run-suite-btn')!.addEventListener('click', () => runSuite(container));

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = (btn as HTMLElement).dataset.filter as Category | 'all';
      renderBrowse(container);
    });
  });

  document.querySelectorAll('.case-header').forEach((header) => {
    header.addEventListener('click', () => {
      header.closest('.case-card')!.classList.toggle('open');
    });
  });
}
