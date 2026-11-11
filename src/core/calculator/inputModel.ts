import { evaluate, formatResult, isCalcError, type AngleMode } from '../expression';

/**
 * Pure state machine behind the calculator keypad. Keeping it free of React
 * makes the editing rules (operator replacement, implicit ×, sign toggling…)
 * easy to unit test and reuse.
 *
 * The expression is stored as a list of display tokens: single characters for
 * digits/operators, and multi-character tokens such as "sin(" so that
 * backspace removes a whole function name at once.
 */

export type CalcKey =
  | { type: 'digit'; value: string }
  | { type: 'decimal' }
  | { type: 'operator'; value: Operator }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'postfix'; value: '%' | '!' | '²' | '⁻¹' }
  | { type: 'function'; value: string } // e.g. "sin(", "√(", "10^("
  | { type: 'constant'; value: 'π' | 'e' }
  | { type: 'sign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'equals' }
  /** Insert a previous result (e.g. from history). */
  | { type: 'recall'; value: string }
  | { type: 'clearHistory' };

export type Operator = '+' | '−' | '×' | '÷' | '^';

export interface HistoryEntry {
  expression: string;
  result: string;
}

export interface CalcState {
  tokens: string[];
  /** True right after "=" — the next digit starts a new expression. */
  evaluated: boolean;
  /** Formatted result of the last successful evaluation. */
  lastResult: string | null;
  /** Expression that produced `lastResult`, shown above it. */
  lastExpression: string | null;
  error: string | null;
  history: HistoryEntry[];
}

export const MAX_TOKENS = 120;
export const MAX_HISTORY = 20;

export const initialCalcState: CalcState = {
  tokens: [],
  evaluated: false,
  lastResult: null,
  lastExpression: null,
  error: null,
  history: [],
};

const OPERATORS = new Set<string>(['+', '−', '×', '÷', '^']);
const isOperator = (t: string | undefined) => t !== undefined && OPERATORS.has(t);
const isDigitToken = (t: string | undefined) => t !== undefined && /^[0-9.]$/.test(t);
const opensGroup = (t: string | undefined) => t !== undefined && t.endsWith('(');
/** Tokens after which a value is complete (so × may be implied). */
const endsOperand = (t: string | undefined) =>
  t !== undefined && (isDigitToken(t) || t === ')' || t === 'π' || t === 'e' || ['%', '!', '²', '⁻¹'].includes(t));

export const expressionText = (tokens: readonly string[]): string => tokens.join('');

function openParenCount(tokens: readonly string[]): number {
  let depth = 0;
  for (const t of tokens) {
    if (opensGroup(t)) depth += 1;
    else if (t === ')') depth -= 1;
  }
  return depth;
}

/** Index where the trailing number (digits / decimal point / exponent) starts. */
function trailingNumberStart(tokens: readonly string[]): number {
  let i = tokens.length;
  while (i > 0) {
    const t = tokens[i - 1];
    if (isDigitToken(t) || t === 'E') {
      i -= 1;
    } else if ((t === '+' || t === '-') && tokens[i - 2] === 'E') {
      i -= 1; // sign inside 1.5E+20
    } else {
      break;
    }
  }
  return i;
}

/** Converts a formatted result into editable tokens. */
function resultToTokens(result: string): string[] {
  const chars = [...result];
  if (chars[0] === '-') chars[0] = '−';
  return chars.length > 1 && chars[0] === '−' ? ['(', ...chars, ')'] : chars;
}

/** Index of the "(" (or "fn(") matching a ")" at position `close`. */
function matchingOpen(tokens: readonly string[], close: number): number {
  let depth = 0;
  for (let i = close; i >= 0; i -= 1) {
    if (tokens[i] === ')') depth += 1;
    else if (opensGroup(tokens[i])) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Starts a new expression, or continues from the last result for operators. */
function baseTokens(state: CalcState, continueFromResult: boolean): string[] {
  if (!state.evaluated) return state.tokens;
  if (continueFromResult && state.lastResult) return resultToTokens(state.lastResult);
  return [];
}

function withTokens(state: CalcState, tokens: string[]): CalcState {
  if (tokens.length > MAX_TOKENS) return state;
  return { ...state, tokens, evaluated: false, error: null };
}

function insertWithImplicitMultiply(tokens: string[], token: string): string[] {
  const last = tokens[tokens.length - 1];
  // A digit straight after ")" / π / e / x! would be ambiguous: insert ×.
  if (/^[0-9]$/.test(token) && endsOperand(last) && !isDigitToken(last)) {
    return [...tokens, '×', token];
  }
  return [...tokens, token];
}

/** Index where the operand ending at `end` begins, or -1 if there is none. */
function operandStart(tokens: readonly string[], end: number): number {
  const t = tokens[end];
  if (t === undefined) return -1;
  if (['%', '!', '²', '⁻¹'].includes(t)) return operandStart(tokens, end - 1);
  if (t === ')') return matchingOpen(tokens, end);
  if (t === 'π' || t === 'e') return end;
  if (isDigitToken(t) || t === 'E' || ((t === '+' || t === '-') && tokens[end - 1] === 'E')) {
    return trailingNumberStart(tokens.slice(0, end + 1));
  }
  return -1;
}

/**
 * ± negates the operand being typed (or the last complete operand) by
 * adjusting the sign in front of it, so the number stays editable:
 *   12 → −12,  5+3 → 5−3,  5−3 → 5+3,  2×3 → 2×−3,  (−7) → 7
 */
function toggleSign(tokens: string[]): string[] {
  const endsWithOperand = endsOperand(tokens[tokens.length - 1]);
  let start = endsWithOperand ? operandStart(tokens, tokens.length - 1) : tokens.length;
  if (start < 0) start = tokens.length;

  // A wrapped negative result "(−42)" simply unwraps to "42".
  if (tokens[start] === '(' && tokens[start + 1] === '−' && tokens[tokens.length - 1] === ')') {
    const inner = tokens.slice(start + 2, -1);
    if (inner.length > 0 && inner.every((t) => isDigitToken(t) || t === 'E' || t === '+' || t === '-')) {
      return [...tokens.slice(0, start), ...inner];
    }
  }

  const p = start - 1;
  const prev = tokens[p];
  const before = tokens[p - 1];
  const prevIsUnaryMinus = prev === '−' && (p === 0 || isOperator(before) || opensGroup(before));

  if (prevIsUnaryMinus) return [...tokens.slice(0, p), ...tokens.slice(start)];
  if (prev === '−') return [...tokens.slice(0, p), '+', ...tokens.slice(start)];
  if (prev === '+') return [...tokens.slice(0, p), '−', ...tokens.slice(start)];
  return [...tokens.slice(0, start), '−', ...tokens.slice(start)];
}

export function evaluateTokens(tokens: readonly string[], angleMode: AngleMode): string {
  return formatResult(evaluate(expressionText(tokens), { angleMode }));
}

/** Live preview shown under the expression; null when not computable yet. */
export function previewResult(state: CalcState, angleMode: AngleMode): string | null {
  if (state.evaluated || state.tokens.length === 0) return null;
  try {
    const value = evaluateTokens(state.tokens, angleMode);
    return value === expressionText(state.tokens) ? null : value;
  } catch {
    return null;
  }
}

export function calcReducer(state: CalcState, key: CalcKey, angleMode: AngleMode): CalcState {
  switch (key.type) {
    case 'clear':
      return { ...initialCalcState, history: state.history };

    case 'backspace': {
      if (state.evaluated) {
        return { ...state, tokens: [], evaluated: false, error: null, lastExpression: null, lastResult: null };
      }
      return { ...state, tokens: state.tokens.slice(0, -1), error: null };
    }

    case 'digit': {
      const tokens = baseTokens(state, false);
      // Avoid leading zeros like "007" (but keep "0.07").
      const numStart = trailingNumberStart(tokens);
      const current = tokens.slice(numStart);
      if (current.length === 1 && current[0] === '0' && numStart === tokens.length - 1) {
        return withTokens(state, [...tokens.slice(0, -1), key.value]);
      }
      return withTokens(state, insertWithImplicitMultiply(tokens, key.value));
    }

    case 'decimal': {
      const tokens = baseTokens(state, false);
      const current = tokens.slice(trailingNumberStart(tokens));
      if (current.includes('.') || current.includes('E')) return state;
      if (current.length === 0) {
        const last = tokens[tokens.length - 1];
        const prefix = endsOperand(last) ? ['×'] : [];
        return withTokens(state, [...tokens, ...prefix, '0', '.']);
      }
      return withTokens(state, [...tokens, '.']);
    }

    case 'operator': {
      const tokens = baseTokens(state, true);
      const last = tokens[tokens.length - 1];

      if (tokens.length === 0 || opensGroup(last)) {
        // Only a leading minus makes sense here.
        return key.value === '−' ? withTokens(state, [...tokens, '−']) : state;
      }
      if (isOperator(last)) {
        // Allow a unary minus after ×, ÷ or ^ (e.g. 5×−2, 2^−1).
        if (key.value === '−' && (last === '×' || last === '÷' || last === '^')) {
          return withTokens(state, [...tokens, '−']);
        }
        // Otherwise replace the previous operator (and a dangling unary minus).
        let trimmed = tokens.slice(0, -1);
        if (isOperator(trimmed[trimmed.length - 1])) trimmed = trimmed.slice(0, -1);
        if (trimmed.length === 0 || opensGroup(trimmed[trimmed.length - 1])) {
          return key.value === '−' ? withTokens(state, [...trimmed, '−']) : withTokens(state, trimmed);
        }
        return withTokens(state, [...trimmed, key.value]);
      }
      if (last === '.') {
        return withTokens(state, [...tokens.slice(0, -1), key.value]);
      }
      return withTokens(state, [...tokens, key.value]);
    }

    case 'paren': {
      if (key.value === '(') {
        const tokens = baseTokens(state, false);
        return withTokens(state, [...tokens, '(']);
      }
      const tokens = state.tokens;
      const last = tokens[tokens.length - 1];
      if (state.evaluated || openParenCount(tokens) <= 0 || isOperator(last) || opensGroup(last)) {
        return state;
      }
      return withTokens(state, [...tokens, ')']);
    }

    case 'postfix': {
      const tokens = baseTokens(state, true);
      const last = tokens[tokens.length - 1];
      if (!endsOperand(last) || last === '.') return state;
      return withTokens(state, [...tokens, key.value]);
    }

    case 'function':
    case 'constant': {
      const tokens = baseTokens(state, false);
      // "2" followed by "10^(" must not merge into "210^(".
      const needsTimes = /^[0-9]/.test(key.value) && endsOperand(tokens[tokens.length - 1]);
      return withTokens(state, [...tokens, ...(needsTimes ? ['×'] : []), key.value]);
    }

    case 'recall': {
      const tokens = baseTokens(state, false);
      const last = tokens[tokens.length - 1];
      const recalled = resultToTokens(key.value);
      if (tokens.length === 0 || isOperator(last) || opensGroup(last)) {
        return withTokens(state, [...tokens, ...recalled]);
      }
      return withTokens(state, recalled);
    }

    case 'clearHistory':
      return { ...state, history: [] };

    case 'sign': {
      const tokens = baseTokens(state, true);
      return withTokens(state, toggleSign(tokens));
    }

    case 'equals': {
      if (state.evaluated || state.tokens.length === 0) return state;
      const expression = expressionText(state.tokens);
      try {
        const result = evaluateTokens(state.tokens, angleMode);
        const closed = expression + ')'.repeat(Math.max(0, openParenCount(state.tokens)));
        return {
          ...state,
          evaluated: true,
          lastResult: result,
          lastExpression: closed,
          error: null,
          history: [{ expression: closed, result }, ...state.history].slice(0, MAX_HISTORY),
        };
      } catch (err) {
        return { ...state, error: isCalcError(err) ? err.message : 'Invalid expression' };
      }
    }
  }
}
