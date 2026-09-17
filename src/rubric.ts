/** The five dimensions every case is scored on, mirroring the criteria real LLM-evaluation rubrics use. */
export const RUBRIC_DIMENSIONS = [
  'factualAccuracy',
  'reasoningValidity',
  'instructionFollowing',
  'safety',
  'clarity',
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<RubricDimension, string> = {
  factualAccuracy: 'Factual accuracy',
  reasoningValidity: 'Reasoning validity',
  instructionFollowing: 'Instruction following',
  safety: 'Safety & appropriateness',
  clarity: 'Clarity & structure',
};

/** 0-4 band definitions, so a score isn't just a bare number. */
export const SCORE_BANDS = [
  { score: 0, label: 'Fails' },
  { score: 1, label: 'Poor' },
  { score: 2, label: 'Mixed' },
  { score: 3, label: 'Good' },
  { score: 4, label: 'Excellent' },
] as const;

export type RubricScores = Record<RubricDimension, number>;

export type IssueType =
  | 'hallucination'
  | 'math-error'
  | 'logical-fallacy'
  | 'unsafe-compliance'
  | 'over-refusal'
  | 'instruction-violation'
  | 'domain-error'
  | 'none';

export interface FlaggedIssue {
  type: IssueType;
  description: string;
}

export type Category =
  | 'math-logic'
  | 'hallucination'
  | 'safety'
  | 'domain-finance'
  | 'domain-law'
  | 'domain-science'
  | 'instruction-following'
  | 'pairwise';

export const CATEGORY_LABELS: Record<Category, string> = {
  'math-logic': 'Mathematical & logical reasoning',
  hallucination: 'LLM / NLP — hallucination & factuality',
  safety: 'AI safety & red-teaming',
  'domain-finance': 'Domain-specific — finance',
  'domain-law': 'Domain-specific — law',
  'domain-science': 'Domain-specific — science & medicine',
  'instruction-following': 'Instruction following',
  pairwise: 'Pairwise comparison',
};

export type Verdict = 'pass' | 'partial' | 'fail';

export interface ExpertVerdict {
  scores: RubricScores;
  issues: FlaggedIssue[];
  rationale: string;
  verdict: Verdict;
}

export interface EvalCase {
  id: string;
  category: Category;
  title: string;
  prompt: string;
  response: string;
  /** Present only for pairwise-comparison cases. */
  responseB?: string;
  pairwiseWinner?: 'A' | 'B' | 'tie';
  /** Whether this case is auto-checked (math) or judged against a hand-authored gold rationale. */
  verification: 'automated' | 'expert-gold';
  groundTruth?: string;
  expert: ExpertVerdict;
}

export function overallScore(scores: RubricScores): number {
  const values = RUBRIC_DIMENSIONS.map((d) => scores[d]);
  return values.reduce((a, b) => a + b, 0) / values.length;
}
