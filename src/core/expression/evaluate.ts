import { CalcError } from './errors';
import { parse, type AstNode, type FunctionName } from './parser';

export type AngleMode = 'deg' | 'rad';

export interface EvaluateOptions {
  /** Unit used for trigonometric input and inverse-trigonometric output. */
  angleMode?: AngleMode;
}

/** Largest n for which n! is representable as a finite double. */
export const MAX_FACTORIAL = 170;

/** Values this close to an integer (or zero) are snapped after trig calls. */
const TRIG_EPSILON = 1e-12;

const DEG_TO_RAD = Math.PI / 180;

function snap(value: number): number {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < TRIG_EPSILON ? rounded : value;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new CalcError('DOMAIN', 'Factorial needs a whole number ≥ 0');
  }
  if (n > MAX_FACTORIAL) {
    throw new CalcError('OVERFLOW', `Factorial is limited to ${MAX_FACTORIAL}!`);
  }
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function callFunction(fn: FunctionName, x: number, angleMode: AngleMode): number {
  const toRadians = (v: number) => (angleMode === 'deg' ? v * DEG_TO_RAD : v);
  const fromRadians = (v: number) => (angleMode === 'deg' ? v / DEG_TO_RAD : v);

  switch (fn) {
    case 'sin':
      return snap(Math.sin(toRadians(x)));
    case 'cos':
      return snap(Math.cos(toRadians(x)));
    case 'tan': {
      if (angleMode === 'deg' && Math.abs(((x % 180) + 180) % 180 - 90) < TRIG_EPSILON) {
        throw new CalcError('DOMAIN', 'tan is undefined at odd multiples of 90°');
      }
      const radians = toRadians(x);
      if (Math.abs(Math.cos(radians)) < TRIG_EPSILON) {
        throw new CalcError('DOMAIN', 'tan is undefined at odd multiples of π/2');
      }
      return snap(Math.tan(radians));
    }
    case 'asin':
    case 'acos': {
      if (x < -1 || x > 1) {
        throw new CalcError('DOMAIN', `${fn === 'asin' ? 'sin⁻¹' : 'cos⁻¹'} needs a value between −1 and 1`);
      }
      return fromRadians(fn === 'asin' ? Math.asin(x) : Math.acos(x));
    }
    case 'atan':
      return fromRadians(Math.atan(x));
    case 'log':
    case 'ln': {
      if (x <= 0) {
        throw new CalcError('DOMAIN', `${fn} needs a value greater than 0`);
      }
      return fn === 'log' ? Math.log10(x) : Math.log(x);
    }
    case 'sqrt':
      if (x < 0) throw new CalcError('DOMAIN', 'Square root of a negative number');
      return Math.sqrt(x);
    case 'cbrt':
      return Math.cbrt(x);
    case 'abs':
      return Math.abs(x);
    case 'exp':
      return Math.exp(x);
  }
}

function power(base: number, exponent: number): number {
  if (base === 0 && exponent < 0) {
    throw new CalcError('DIVIDE_BY_ZERO', 'Cannot divide by zero');
  }
  if (base === 0 && exponent === 0) {
    return 1; // conventional calculator behaviour
  }
  const result = base ** exponent;
  if (Number.isNaN(result)) {
    throw new CalcError('DOMAIN', 'A negative number cannot be raised to a fractional power');
  }
  return result;
}

function evaluateNode(node: AstNode, angleMode: AngleMode): number {
  switch (node.kind) {
    case 'number':
      return node.value;

    case 'constant':
      return node.name === 'pi' ? Math.PI : Math.E;

    case 'unary': {
      const value = evaluateNode(node.operand, angleMode);
      return node.op === '-' ? -value : value;
    }

    case 'postfix': {
      const value = evaluateNode(node.operand, angleMode);
      switch (node.op) {
        case '!':
          return factorial(value);
        case '%':
          return value / 100;
        case 'square':
          return value * value;
        case 'reciprocal':
          if (value === 0) throw new CalcError('DIVIDE_BY_ZERO', 'Cannot divide by zero');
          return 1 / value;
      }
      break;
    }

    case 'call':
      return callFunction(node.fn, evaluateNode(node.arg, angleMode), angleMode);

    case 'binary': {
      const left = evaluateNode(node.left, angleMode);

      // Calculator-style percentages: 200 + 10% = 220, 200 − 10% = 180.
      // In every other position x% simply means x / 100.
      if ((node.op === '+' || node.op === '-') && node.right.kind === 'postfix' && node.right.op === '%') {
        const pct = evaluateNode(node.right.operand, angleMode);
        const delta = (left * pct) / 100;
        return node.op === '+' ? left + delta : left - delta;
      }

      const right = evaluateNode(node.right, angleMode);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          if (right === 0) throw new CalcError('DIVIDE_BY_ZERO', 'Cannot divide by zero');
          return left / right;
        case '^':
          return power(left, right);
      }
    }
  }
  throw new CalcError('SYNTAX', 'Invalid expression');
}

/**
 * Safely evaluates a calculator expression. Never uses `eval`/`Function`:
 * input is tokenized, parsed into an AST and walked.
 *
 * @throws CalcError with a user-presentable message.
 */
export function evaluate(expression: string, options: EvaluateOptions = {}): number {
  const ast = parse(expression);
  const result = evaluateNode(ast, options.angleMode ?? 'deg');
  if (!Number.isFinite(result)) {
    throw new CalcError('OVERFLOW', 'Result is too large to display');
  }
  return Object.is(result, -0) ? 0 : result;
}
