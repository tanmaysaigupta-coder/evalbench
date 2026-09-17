import { DIMENSION_LABELS, RUBRIC_DIMENSIONS, type RubricScores } from './rubric';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function scoreClass(score: number): string {
  if (score <= 1) return 'low';
  if (score === 2) return 'mid';
  return '';
}

/** Renders the 5-dimension rubric as filled segment bars. Pass `compareTo` to also show a delta marker against another score set (used in practice mode). */
export function renderScores(scores: RubricScores, compareTo?: RubricScores): string {
  return `
    <div class="scores-grid">
      ${RUBRIC_DIMENSIONS.map((dim) => {
        const score = scores[dim];
        const segs = Array.from({ length: 4 }, (_, i) => `<div class="score-seg ${i < score ? 'filled' : ''}"></div>`).join('');
        const delta = compareTo ? score - compareTo[dim] : null;
        const deltaLabel =
          delta === null || delta === 0
            ? ''
            : `<span class="delta ${delta > 0 ? 'over' : 'under'}">${delta > 0 ? '+' : ''}${delta}</span>`;
        return `
          <div class="score-item ${scoreClass(score)}">
            <div class="dim">${DIMENSION_LABELS[dim]} — ${score}/4 ${deltaLabel}</div>
            <div class="score-bar">${segs}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
