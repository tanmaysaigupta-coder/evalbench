import './style.css';
import { CASES } from './fixtures/cases';
import { CATEGORY_LABELS, DIMENSION_LABELS, RUBRIC_DIMENSIONS, type Category, type EvalCase, type RubricDimension } from './rubric';
import { analyzeCase } from './engine';

const app = document.getElementById('app')!;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// ---------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------

const passCount = CASES.filter((c) => c.expert.verdict === 'pass').length;
const failCount = CASES.filter((c) => c.expert.verdict === 'fail').length;
const partialCount = CASES.filter((c) => c.expert.verdict === 'partial').length;
const automatedCases = CASES.filter((c) => c.verification === 'automated');
const automatedAgreeCount = automatedCases.filter((c) => analyzeCase(c).agrees !== false).length;

function renderSummary(): string {
  return `
    <div class="summary">
      <div class="summary-cell"><div class="k">Total cases</div><div class="v">${CASES.length}</div></div>
      <div class="summary-cell"><div class="k">Pass</div><div class="v pass-text">${passCount}</div></div>
      <div class="summary-cell"><div class="k">Fail / partial</div><div class="v fail-text">${failCount + partialCount}</div></div>
      <div class="summary-cell"><div class="k">Automated math checks agree</div><div class="v">${automatedAgreeCount}/${automatedCases.length}</div></div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Score rendering
// ---------------------------------------------------------------------

function scoreClass(score: number): string {
  if (score <= 1) return 'low';
  if (score === 2) return 'mid';
  return '';
}

function renderScores(scores: Record<RubricDimension, number>): string {
  return `
    <div class="scores-grid">
      ${RUBRIC_DIMENSIONS.map((dim) => {
        const score = scores[dim];
        const segs = Array.from({ length: 4 }, (_, i) => `<div class="score-seg ${i < score ? 'filled' : ''}"></div>`).join('');
        return `
          <div class="score-item ${scoreClass(score)}">
            <div class="dim">${DIMENSION_LABELS[dim]} — ${score}/4</div>
            <div class="score-bar">${segs}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------
// Case card rendering
// ---------------------------------------------------------------------

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
        <span class="verdict-badge ${evalCase.expert.verdict}">${evalCase.expert.verdict}</span>
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

// ---------------------------------------------------------------------
// Filters + list
// ---------------------------------------------------------------------

const categories = Array.from(new Set(CASES.map((c) => c.category))) as Category[];
let activeFilter: Category | 'all' = 'all';

function renderCaseList(): string {
  const filtered = activeFilter === 'all' ? CASES : CASES.filter((c) => c.category === activeFilter);
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

// ---------------------------------------------------------------------
// Root render
// ---------------------------------------------------------------------

function render() {
  app.innerHTML = `
    <div class="wrap">
      <div class="kicker">● rubric-driven evaluation · ${CASES.length} hand-curated cases</div>
      <h1>Eval<span>Bench</span></h1>
      <p class="lede">
        A framework for evaluating AI-generated responses the way an expert reviewer would: a fixed <b>5-dimension rubric</b>
        (factual accuracy, reasoning validity, instruction following, safety, clarity), a curated battery of cases that each
        reproduce a <b>specific, realistic failure mode</b> — not synthetic noise — and, wherever a claim is mechanically
        checkable, a real arithmetic verifier instead of eyeballing the numbers.
      </p>
      <div class="note">
        <span>ℹ️</span>
        <span><b>How to read this:</b> every case has a hand-authored gold verdict with a rationale, the way a calibration set
        works for real evaluator teams. Cases marked "automated" are additionally cross-checked by a from-scratch arithmetic
        parser (see the math verifier) — everything else is judged the way domain expertise actually gets applied: against a
        reasoned, defensible gold answer, not a model grading another model.</span>
      </div>

      ${renderSummary()}

      <div class="steps">
        <div class="step">
          <div class="num">1</div>
          <h3>Mechanical checks where possible</h3>
          <p>A hand-written arithmetic parser (no <code>eval()</code>) extracts every "expression = value" claim a response
          makes and verifies it against ground truth — catching confidently-stated wrong math that reads as correct.</p>
        </div>
        <div class="step">
          <div class="num">2</div>
          <h3>Structured rubric everywhere else</h3>
          <p>Hallucinations, logical fallacies, unsafe compliance, domain errors, and instruction violations are scored
          against the same 5-dimension rubric with a documented rationale — consistent criteria, not vibes.</p>
        </div>
        <div class="step">
          <div class="num">3</div>
          <h3>Control cases included on purpose</h3>
          <p>Several cases are deliberately <em>correct</em> — testing whether the evaluation process itself has a false-positive
          problem is as important as catching real errors.</p>
        </div>
      </div>

      <div id="filters"></div>
      <div id="case-list"></div>

      <footer>
        <span>Zero external dependencies for the evaluation engine &middot; every gold verdict is hand-authored</span>
        <a href="https://github.com/tanmaysaigupta-coder/evalbench" target="_blank" rel="noopener">Source →</a>
      </footer>
    </div>
  `;

  document.getElementById('filters')!.innerHTML = renderFilters();
  document.getElementById('case-list')!.innerHTML = renderCaseList();
  attachHandlers();
}

function attachHandlers() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = (btn as HTMLElement).dataset.filter as Category | 'all';
      render();
    });
  });

  document.querySelectorAll('.case-header').forEach((header) => {
    header.addEventListener('click', () => {
      header.closest('.case-card')!.classList.toggle('open');
    });
  });
}

render();
