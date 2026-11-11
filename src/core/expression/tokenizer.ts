import { CalcError } from './errors';

export type BinaryOperator = '+' | '-' | '*' | '/' | '^';
export type PostfixOperator = '!' | '%' | 'square' | 'reciprocal';

export type Token =
  | { type: 'number'; value: number; pos: number }
  | { type: 'operator'; value: BinaryOperator; pos: number }
  | { type: 'postfix'; value: PostfixOperator; pos: number }
  | { type: 'identifier'; value: string; pos: number }
  | { type: 'lparen'; pos: number }
  | { type: 'rparen'; pos: number };

/** Display glyphs the UI uses, mapped onto canonical operators. */
const OPERATOR_ALIASES: Record<string, BinaryOperator> = {
  '+': '+',
  '-': '-',
  '−': '-', // U+2212 minus sign
  '–': '-', // en dash (pasted text)
  '*': '*',
  '×': '*',
  '·': '*',
  '/': '/',
  '÷': '/',
  '^': '^',
};

const SYMBOL_IDENTIFIERS: Record<string, string> = {
  'π': 'pi',
  '√': 'sqrt',
  '∛': 'cbrt',
};

const INVERSE_SUFFIX = '⁻¹';

const isDigit = (ch: string | undefined): boolean =>
  ch !== undefined && ch >= '0' && ch <= '9';
const isLetter = (ch: string | undefined): boolean =>
  ch !== undefined && /[a-z]/i.test(ch);

/**
 * Converts an expression string into tokens.
 *
 * Notes on notation:
 * - Lowercase `e` is always Euler's number. Scientific notation uses an
 *   uppercase `E` (e.g. `1.5E+20`), which is also how results are formatted,
 *   so a result can always be fed back in as input.
 * - Thousands separators (`,`) and whitespace are ignored.
 * - `sin⁻¹` style names are mapped to `asin` etc.; a standalone `⁻¹` after an
 *   operand is the reciprocal operator.
 */
export function tokenize(source: string): Token[] {
  const input = source.replace(/,/g, '');
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1]))) {
      const start = i;
      while (isDigit(input[i])) i += 1;
      if (input[i] === '.') {
        i += 1;
        while (isDigit(input[i])) i += 1;
      }
      if (input[i] === '.') {
        throw new CalcError('SYNTAX', 'A number can only have one decimal point');
      }
      // Scientific notation: 1.5E+20 / 2E-3 / 4E7
      if (input[i] === 'E') {
        const signOffset = input[i + 1] === '+' || input[i + 1] === '-' ? 1 : 0;
        if (isDigit(input[i + 1 + signOffset])) {
          i += 1 + signOffset;
          while (isDigit(input[i])) i += 1;
        }
      }
      tokens.push({ type: 'number', value: Number(input.slice(start, i)), pos: start });
      continue;
    }

    if (ch === '.') {
      throw new CalcError('SYNTAX', 'Incomplete number');
    }

    if (isLetter(ch)) {
      const start = i;
      while (isLetter(input[i])) i += 1;
      let name = input.slice(start, i).toLowerCase();
      if (input.startsWith(INVERSE_SUFFIX, i)) {
        name = `a${name}`;
        i += INVERSE_SUFFIX.length;
      }
      tokens.push({ type: 'identifier', value: name, pos: start });
      continue;
    }

    const symbolName = SYMBOL_IDENTIFIERS[ch];
    if (symbolName) {
      tokens.push({ type: 'identifier', value: symbolName, pos: i });
      i += 1;
      continue;
    }

    if (input.startsWith(INVERSE_SUFFIX, i)) {
      tokens.push({ type: 'postfix', value: 'reciprocal', pos: i });
      i += INVERSE_SUFFIX.length;
      continue;
    }

    const operator = OPERATOR_ALIASES[ch];
    if (operator) {
      tokens.push({ type: 'operator', value: operator, pos: i });
      i += 1;
      continue;
    }

    switch (ch) {
      case '(':
        tokens.push({ type: 'lparen', pos: i });
        break;
      case ')':
        tokens.push({ type: 'rparen', pos: i });
        break;
      case '!':
        tokens.push({ type: 'postfix', value: '!', pos: i });
        break;
      case '%':
        tokens.push({ type: 'postfix', value: '%', pos: i });
        break;
      case '²':
        tokens.push({ type: 'postfix', value: 'square', pos: i });
        break;
      default:
        throw new CalcError('SYNTAX', `Unexpected character “${ch}”`);
    }
    i += 1;
  }

  return tokens;
}
