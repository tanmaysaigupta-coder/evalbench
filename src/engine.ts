import { checkNumericClaims, type NumericClaimCheck } from './verifiers/mathExpr';
import type { EvalCase } from './rubric';

/** Normalizes the visual/typographic variants models tend to use so the parser sees plain ASCII arithmetic. */
function normalizeForParsing(text: string): string {
  return text
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\$/g, '')
    .replace(/(\d),(\d{3})/g, '$1$2') // strip thousands separators: 13,891.50 -> 13891.50
    .replace(/(\d),(\d{3})/g, '$1$2'); // run twice for numbers with two comma groups (e.g. 1,234,567)
}

export interface AutomatedCheckResult {
  ran: boolean;
  claims: NumericClaimCheck[];
  allMatch: boolean;
}

/** Runs the safe arithmetic parser over a response and reports every "expression = value" claim it can find. */
export function runAutomatedCheck(evalCase: EvalCase): AutomatedCheckResult {
  if (evalCase.verification !== 'automated') {
    return { ran: false, claims: [], allMatch: true };
  }
  const claims = checkNumericClaims(normalizeForParsing(evalCase.response));
  return { ran: true, claims, allMatch: claims.every((c) => c.matches) };
}

export interface CaseAgreement {
  evalCase: EvalCase;
  automated: AutomatedCheckResult;
  /** Whether the automated arithmetic check agrees with the expert verdict's pass/fail call, where applicable. */
  agrees: boolean | null;
}

export function analyzeCase(evalCase: EvalCase): CaseAgreement {
  const automated = runAutomatedCheck(evalCase);
  if (!automated.ran || automated.claims.length === 0) {
    return { evalCase, automated, agrees: null };
  }
  const expertSaysCorrect = evalCase.expert.verdict === 'pass';
  const agrees = automated.allMatch === expertSaysCorrect;
  return { evalCase, automated, agrees };
}
