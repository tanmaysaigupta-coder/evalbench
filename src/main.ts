import './style.css';
import { CASES } from './fixtures/cases';
import { renderBrowse } from './browse';
import { renderPlayground } from './playground';

const app = document.getElementById('app')!;

type View = 'playground' | 'browse';
let activeView: View = 'playground';

function renderShell() {
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

      <div class="view-tabs">
        <button class="view-tab ${activeView === 'playground' ? 'active' : ''}" data-view="playground">▶ Live playground</button>
        <button class="view-tab ${activeView === 'browse' ? 'active' : ''}" data-view="browse">Test suite (${CASES.length} cases)</button>
      </div>

      <div id="view-content"></div>

      <footer>
        <span>Zero external dependencies for the evaluation engine &middot; every gold verdict is hand-authored</span>
        <a href="https://github.com/tanmaysaigupta-coder/evalbench" target="_blank" rel="noopener">Source →</a>
      </footer>
    </div>
  `;

  document.querySelectorAll('.view-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeView = (btn as HTMLElement).dataset.view as View;
      renderShell();
    });
  });

  const content = document.getElementById('view-content')!;
  if (activeView === 'playground') renderPlayground(content);
  else renderBrowse(content);
}

renderShell();
