import { CalcError } from './errors';
import { tokenize, type BinaryOperator, type PostfixOperator, type Token } from './tokenizer';

export type AstNode =
  | { kind: 'number'; value: number }
  | { kind: 'constant'; name: ConstantName }
  | { kind: 'unary'; op: '+' | '-'; operand: AstNode }
  | { kind: 'binary'; op: BinaryOperator; left: AstNode; right: AstNode }
  | { kind: 'postfix'; op: PostfixOperator; operand: AstNode }
  | { kind: 'call'; fn: FunctionName; arg: AstNode };

export const CONSTANTS = ['pi', 'e'] as const;
export type ConstantName = (typeof CONSTANTS)[number];

export const FUNCTIONS = [
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'ln',
  'sqrt',
  'cbrt',
  'abs',
  'exp',
] as const;
export type FunctionName = (typeof FUNCTIONS)[number];

const isConstant = (name: string): name is ConstantName =>
  (CONSTANTS as readonly string[]).includes(name);
const isFunction = (name: string): name is FunctionName =>
  (FUNCTIONS as readonly string[]).includes(name);

/**
 * Recursive-descent parser. Precedence, lowest to highest:
 *
 *   additive        +  -
 *   multiplicative  ×  ÷  and implicit multiplication (2π, 3(4), 2sin(30))
 *   unary           +x  −x
 *   power           x^y   (right-associative, binds tighter than unary minus,
 *                          so −2^2 = −4 as in standard mathematical notation)
 *   postfix         x!  x%  x²  x⁻¹
 *   primary         numbers, constants, function calls, ( … )
 *
 * Missing closing parentheses at the end of the input are closed
 * automatically, the way handheld calculators behave.
 */
class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): AstNode {
    if (this.tokens.length === 0) {
      throw new CalcError('EMPTY', 'Enter an expression');
    }
    const node = this.parseAdditive();
    const extra = this.peek();
    if (extra) {
      if (extra.type === 'rparen') {
        throw new CalcError('SYNTAX', 'Unmatched closing parenthesis');
      }
      throw new CalcError('SYNTAX', 'Unexpected input after expression');
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private next(): Token | undefined {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    for (;;) {
      const token = this.peek();
      if (token?.type === 'operator' && (token.value === '+' || token.value === '-')) {
        this.next();
        const right = this.parseMultiplicative();
        left = { kind: 'binary', op: token.value, left, right };
      } else {
        return left;
      }
    }
  }

  private parseMultiplicative(): AstNode {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (token?.type === 'operator' && (token.value === '*' || token.value === '/')) {
        this.next();
        const right = this.parseUnary();
        left = { kind: 'binary', op: token.value, left, right };
      } else if (token && (token.type === 'identifier' || token.type === 'lparen')) {
        // Implicit multiplication: 2π, 3(4+1), (1+1)(2), 2sin(30)
        const right = this.parsePower();
        left = { kind: 'binary', op: '*', left, right };
      } else if (token?.type === 'number') {
        throw new CalcError('SYNTAX', 'Missing operator between numbers');
      } else {
        return left;
      }
    }
  }

  private parseUnary(): AstNode {
    const token = this.peek();
    if (token?.type === 'operator' && (token.value === '-' || token.value === '+')) {
      this.next();
      return { kind: 'unary', op: token.value, operand: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): AstNode {
    const base = this.parsePostfix();
    const token = this.peek();
    if (token?.type === 'operator' && token.value === '^') {
      this.next();
      // Right-associative, and allows a signed exponent: 2^-1, 2^3^2 = 2^9
      const exponent = this.parseUnary();
      return { kind: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  private parsePostfix(): AstNode {
    let node = this.parsePrimary();
    for (;;) {
      const token = this.peek();
      if (token?.type !== 'postfix') return node;
      this.next();
      node = { kind: 'postfix', op: token.value, operand: node };
    }
  }

  private parsePrimary(): AstNode {
    const token = this.next();

    if (!token) {
      throw new CalcError('SYNTAX', 'Expression is incomplete');
    }

    switch (token.type) {
      case 'number':
        return { kind: 'number', value: token.value };

      case 'lparen': {
        if (this.peek()?.type === 'rparen') {
          throw new CalcError('SYNTAX', 'Empty parentheses');
        }
        const inner = this.parseAdditive();
        this.consumeClosingParen();
        return inner;
      }

      case 'identifier': {
        const name = token.value;
        if (isConstant(name)) return { kind: 'constant', name };
        if (isFunction(name)) {
          if (this.peek()?.type !== 'lparen') {
            throw new CalcError('SYNTAX', `Use brackets after ${name}, e.g. ${name}(30)`);
          }
          this.next();
          if (this.peek()?.type === 'rparen') {
            throw new CalcError('SYNTAX', `${name}() needs a value`);
          }
          const arg = this.parseAdditive();
          this.consumeClosingParen();
          return { kind: 'call', fn: name, arg };
        }
        throw new CalcError('SYNTAX', `Unknown function “${name}”`);
      }

      case 'rparen':
        throw new CalcError('SYNTAX', 'Unexpected closing parenthesis');

      case 'operator':
        throw new CalcError('SYNTAX', 'Expression is incomplete');

      case 'postfix':
        throw new CalcError('SYNTAX', 'Operator is missing a value');
    }
  }

  private consumeClosingParen(): void {
    const token = this.peek();
    if (token?.type === 'rparen') {
      this.next();
      return;
    }
    if (token === undefined) {
      return; // auto-close at end of input
    }
    throw new CalcError('SYNTAX', 'Missing closing parenthesis');
  }
}

export function parse(input: string): AstNode {
  return new Parser(tokenize(input)).parse();
}
