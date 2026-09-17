# EvalBench

**A rubric-driven framework for evaluating AI-generated responses, with a hand-curated adversarial test battery covering mathematical/logical reasoning, hallucination detection, AI safety & red-teaming, and domain-specific evaluation (finance, law, medicine).**

This isn't a demo of an AI model. It's a demonstration of the evaluation methodology itself: a fixed rubric, a real (non-`eval()`) arithmetic verifier for mechanically checkable claims, and 18 hand-written cases that each reproduce one *specific, realistic* failure mode a language model produces — not synthetic noise, and not a model grading another model.

> Live site: **https://<your-username>.github.io/evalbench/**

## Why this exists

Evaluating AI output well is a specific, learnable skill: hold every response to a consistent rubric, verify what's mechanically checkable instead of trusting confident prose, and write a rationale that would survive a calibration review by another evaluator. This project is a working demonstration of that discipline, applied to 18 cases across the categories real LLM-evaluation work actually covers:

- **Mathematical & logical reasoning** — arithmetic errors, invalid inference (affirming the consequent), and control cases of valid reasoning.
- **Hallucination & factuality** — fabricated citations, confidently-stated wrong dates, and control cases of correct, appropriately-hedged answers (included specifically to check the evaluation process itself doesn't have a false-positive problem).
- **AI safety & red-teaming** — a disguised-intent request that should be refused but is complied with, a request that's over-refused despite being benign and protective, and a well-handled refusal that still solves the user's actual problem.
- **Domain-specific evaluation** — a finance NPV calculation that silently flips the investment decision, a legal-clause conflation, and a pediatric dosage arithmetic error.
- **Instruction-following** — an explicit format constraint ignored vs. followed precisely.
- **Pairwise comparison** — two responses to the same prompt, scored head-to-head, including a case where the "better-sounding" response is actually the one that hallucinated a detail.

## What's automated vs. hand-judged — and why that split matters

- **Automated** (3 cases): a from-scratch recursive-descent arithmetic parser ([`src/verifiers/mathExpr.ts`](src/verifiers/mathExpr.ts)) extracts every `expression = value` claim a response makes and checks it against the real computed result. This is what catches a compound-interest calculation that gets the method right but the final multiplication wrong ([`MATH-02`](src/fixtures/cases.ts)) — the kind of confidently-stated error that's easy to miss on a skim.
- **Expert-gold** (the rest): judged against a hand-authored gold rationale, the way real evaluator calibration sets work. A finance NPV error, for instance, is *arithmetically self-consistent* in its own flawed method — no parser catches that, because the bug is in which formula to apply, not in the multiplication. That distinction is deliberate: it's the difference between what mechanical verification can catch and what actually requires domain judgment, which is the whole point of the job this project is built to demonstrate skill for.

Every case's automated result (where applicable) is cross-checked against its hand-authored verdict in the test suite — see `npm test`.

## Running locally

```bash
npm install
npm run dev
```

```bash
npm test        # runs the verifier + fixture-consistency test suite
npm run build    # type-checks, then produces a static dist/ build
```

## Project structure

```
src/
  verifiers/mathExpr.ts   Safe arithmetic parser + tokenizer (no eval()) and claim extractor
  rubric.ts                 Rubric dimensions, score bands, case/verdict types
  engine.ts                   Runs the automated checker and cross-checks it against expert verdicts
  fixtures/cases.ts             The 18-case test battery — prompt, response(s), gold verdict, rationale
  main.ts                         Renders the filterable, expandable case-review UI
test/verifier.test.ts               Unit tests for the parser + battery-wide consistency checks
```

## Test battery design notes

A few deliberate choices worth calling out, because they're the part that's actually hard to get right in real evaluation work:

- **Control cases are included on purpose.** Several cases (`MATH-01`, `MATH-04`, `HALL-03`, `HALL-04`, `INSTR-02`) are correct responses. An evaluation process that only ever sees broken examples during development will overfit to finding problems; testing for false positives is as important as catching real errors.
- **Mixed-accuracy responses are scored for what dominates the risk**, not averaged naively — `HALL-01` is mostly correct but fabricates one detail, and that fabrication is what the verdict weights, because a user has no local signal to distinguish the correct part from the invented part.
- **Decision-reversing errors are flagged more heavily than same-magnitude errors that don't change the outcome** — `FIN-01`'s NPV sign error flips an "accept" recommendation to what should have been "reject," which matters more than the raw dollar delta.
- **Over-refusal is treated as a real failure, not just an annoyance** (`SAFE-03`) — refusing a benign, protective request (labeling household chemicals for child safety) actively works against the user's stated goal.

## Stack

TypeScript · Vite · zero runtime dependencies (the evaluation engine and arithmetic verifier are hand-written, not wrappers around a library) · GitHub Actions

## License

[MIT](LICENSE)
