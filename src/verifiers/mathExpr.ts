/**
 * A small, safe recursive-descent arithmetic evaluator — no `eval()`, no
 * `Function()`. Supports + - * / ^, unary minus, parentheses, and decimals.
 * Used to mechanically verify numeric claims a model makes ("... = 47.5")
 * rather than trusting them by eye.
 */

type TokenType = 'num' | 'op' | 'lparen' | 'rparen' | 'end';
interface Token {
  type: TokenType;
  value: string;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ type: 'num', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/^'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen', value: c });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', value: c });
      i++;
      continue;
    }
    throw new Error(`unexpected character '${c}' in expression`);
  }
  tokens.push({ type: 'end', value: '' });
  return tokens;
}

/** Grammar: expr := term (('+'|'-') term)*; term := unary (('*'|'/') unary)*; unary := '-' unary | power; power := atom ('^' unary)?; atom := NUM | '(' expr ')' */
class Parser {
  private pos = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek() {
    return this.tokens[this.pos];
  }
  private next() {
    return this.tokens[this.pos++];
  }
  isAtEnd(): boolean {
    return this.peek().type === 'end';
  }

  parseExpr(): number {
    let value = this.parseTerm();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      const rhs = this.parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    while (this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.next().value;
      const rhs = this.parseUnary();
      if (op === '/' && rhs === 0) throw new Error('division by zero');
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  private parseUnary(): number {
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.next();
      return -this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parseAtom();
    if (this.peek().type === 'op' && this.peek().value === '^') {
      this.next();
      const exp = this.parseUnary();
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseAtom(): number {
    const tok = this.peek();
    if (tok.type === 'num') {
      this.next();
      return parseFloat(tok.value);
    }
    if (tok.type === 'lparen') {
      this.next();
      const value = this.parseExpr();
      if (this.peek().type !== 'rparen') throw new Error("expected ')'");
      this.next();
      return value;
    }
    throw new Error(`unexpected token '${tok.value}'`);
  }
}

export function evaluateExpression(src: string): number {
  const parser = new Parser(tokenize(src));
  const value = parser.parseExpr();
  if (!parser.isAtEnd()) throw new Error('trailing input');
  return value;
}

/**
 * Pulls "X = Y" style numeric claims out of free text (e.g. a model's final
 * answer line) and checks each claimed result against the real evaluated
 * value of the left-hand expression.
 */
export interface NumericClaimCheck {
  claimText: string;
  expression: string;
  claimedValue: number;
  actualValue: number;
  matches: boolean;
}

const CLAIM_PATTERN = /([0-9()][0-9+\-*/^().\s]*[0-9)])\s*=\s*(-?[0-9]+(?:\.[0-9]+)?)/g;

export function checkNumericClaims(text: string, epsilon = 1e-6): NumericClaimCheck[] {
  const results: NumericClaimCheck[] = [];
  for (const match of text.matchAll(CLAIM_PATTERN)) {
    const [claimText, expression, claimedStr] = match;
    try {
      const actualValue = evaluateExpression(expression);
      const claimedValue = parseFloat(claimedStr);
      results.push({
        claimText: claimText.trim(),
        expression: expression.trim(),
        claimedValue,
        actualValue,
        matches: Math.abs(actualValue - claimedValue) < epsilon,
      });
    } catch {
      // not a parseable arithmetic expression (e.g. "n = 5" from prose) — skip it
    }
  }
  return results;
}
