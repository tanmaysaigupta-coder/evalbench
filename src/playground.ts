import { checkNumericClaims } from './verifiers/mathExpr';
import { escapeHtml } from './shared';

/** Same normalization engine.ts uses for fixtures — kept here too since the playground runs on arbitrary user text. */
function normalizeForParsing(text: string): string {
  return text
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\$/g, '')
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/(\d),(\d{3})/g, '$1$2');
}

const EXAMPLES: Record<string, string> = {
  flawed: "Using A = P(1 + r)^t, with P = 8500, r = 0.04, t = 5, the growth factor (1.04)^5 works out to about 1.2167. Final check: 8500 * 1.2167 = 10200.00\nSo the final balance is approximately $10,200.",
  correct: "Using the compound interest formula A = P(1 + r)^t, with P = 12000, r = 0.05, t = 3, the growth factor (1 + 0.05)^3 works out to 1.157625. Final check: 12000 * 1.157625 = 13891.50\nSo the final balance is $13,891.50.",
  dosage: "Total daily dose = 15 * 22 = 330 mg. Divided into 3 doses: 330 / 3 = 90 mg per dose.",
  clean: "We had 42 users on day one. By day seven, growth of 15 * 6 = 90 percent brought us to 42 * 1.9 = 79.8, so roughly 80 active users.",
};

let currentText = EXAMPLES.flawed;

function buildHighlightedHtml(normalized: string, claims: ReturnType<typeof checkNumericClaims>): string {
  if (claims.length === 0) return escapeHtml(normalized);
  const sorted = [...claims].sort((a, b) => a.index - b.index);
  let html = '';
  let cursor = 0;
  for (const claim of sorted) {
    html += escapeHtml(normalized.slice(cursor, claim.index));
    const cls = claim.matches ? 'hl-ok' : 'hl-bad';
    html += `<mark class="${cls}">${escapeHtml(normalized.slice(claim.index, claim.index + claim.length))}</mark>`;
    cursor = claim.index + claim.length;
  }
  html += escapeHtml(normalized.slice(cursor));
  return html;
}

function renderResults(container: HTMLElement) {
  const normalized = normalizeForParsing(currentText);
  const claims = checkNumericClaims(normalized);
  const wrongCount = claims.filter((c) => !c.matches).length;

  const highlighted = buildHighlightedHtml(normalized, claims);

  const claimRows = claims
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

  const verdictBanner =
    claims.length === 0
      ? `<div class="pg-banner neutral">No checkable "expression = value" claims found in this text yet.</div>`
      : wrongCount > 0
        ? `<div class="pg-banner bad">⚠ Found ${wrongCount} incorrect claim${wrongCount > 1 ? 's' : ''} out of ${claims.length}.</div>`
        : `<div class="pg-banner ok">✓ All ${claims.length} numeric claim${claims.length > 1 ? 's' : ''} check out.</div>`;

  container.innerHTML = `
    ${verdictBanner}
    <div class="field-label" style="margin-top:14px;">Parsed text (normalized: × → *, commas stripped) with claims highlighted</div>
    <div class="field-content pg-highlighted">${highlighted}</div>
    ${
      claims.length > 0
        ? `<div class="automated-check" style="margin-top:14px;"><div class="ac-title">Every claim the parser found</div>${claimRows}</div>`
        : ''
    }
  `;
}

export function renderPlayground(container: HTMLElement) {
  container.innerHTML = `
    <div class="note" style="margin-bottom:20px;">
      <span>▶</span>
      <span><b>This runs live in your browser.</b> Paste any AI-generated response (or edit the example below) and the
      hand-written arithmetic parser will find every "expression = value" claim in it and check each one against the
      real computed result — the same engine that catches the errors in the test suite below.</span>
    </div>
    <div class="pg-examples">
      <button class="filter-btn" data-example="flawed">Load: compound interest (flawed)</button>
      <button class="filter-btn" data-example="correct">Load: compound interest (correct)</button>
      <button class="filter-btn" data-example="dosage">Load: dosage calc (flawed)</button>
      <button class="filter-btn" data-example="clean">Load: growth stats (mixed)</button>
    </div>
    <textarea id="pg-input" class="pg-textarea" spellcheck="false"></textarea>
    <button id="pg-analyze" class="btn-primary">▶ Analyze</button>
    <div id="pg-results" class="pg-results"></div>
  `;

  const textarea = document.getElementById('pg-input') as HTMLTextAreaElement;
  const resultsEl = document.getElementById('pg-results')!;
  textarea.value = currentText;

  function analyze() {
    currentText = textarea.value;
    renderResults(resultsEl);
  }

  document.getElementById('pg-analyze')!.addEventListener('click', analyze);
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze();
  });

  container.querySelectorAll('[data-example]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = (btn as HTMLElement).dataset.example!;
      currentText = EXAMPLES[key]!;
      textarea.value = currentText;
      analyze();
    });
  });

  analyze();
}
