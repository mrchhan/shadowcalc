import { describe, expect, it } from 'vitest';
import { CalcError, evaluate, formatResult, groupDigits } from '../src/core/expression';

const calc = (expr: string, angleMode: 'deg' | 'rad' = 'deg') => formatResult(evaluate(expr, { angleMode }));

const expectError = (expr: string, code: CalcError['code'], angleMode: 'deg' | 'rad' = 'deg') => {
  try {
    evaluate(expr, { angleMode });
  } catch (err) {
    expect(err).toBeInstanceOf(CalcError);
    expect((err as CalcError).code).toBe(code);
    return;
  }
  throw new Error(`Expected "${expr}" to throw ${code}`);
};

describe('standard arithmetic', () => {
  it.each([
    ['2+3×4', '14'],
    ['(2+3)×4', '20'],
    ['10−4−3', '3'],
    ['100÷10÷2', '5'],
    ['7÷2', '3.5'],
    ['0.1+0.2', '0.3'],
    ['−5+2', '-3'],
    ['3×−2', '-6'],
    ['2(3+4)', '14'],
    ['(1+1)(2+2)', '8'],
    ['((2+3)', '5'], // auto-closes
    ['1,234+1', '1235'],
  ])('%s = %s', (expr, expected) => {
    expect(calc(expr)).toBe(expected);
  });

  it('applies calculator-style percentages', () => {
    expect(calc('200+10%')).toBe('220');
    expect(calc('200−10%')).toBe('180');
    expect(calc('50×10%')).toBe('5');
    expect(calc('25%')).toBe('0.25');
  });

  it('handles division by zero gracefully', () => {
    expectError('5÷0', 'DIVIDE_BY_ZERO');
    expectError('1÷(2−2)', 'DIVIDE_BY_ZERO');
    expectError('0^−1', 'DIVIDE_BY_ZERO');
  });

  it('rejects invalid expressions with syntax errors', () => {
    expectError('', 'EMPTY');
    expectError('5+', 'SYNTAX');
    expectError('×5', 'SYNTAX');
    expectError('2)', 'SYNTAX');
    expectError('1.2.3', 'SYNTAX');
    expectError('()', 'SYNTAX');
    expectError('foo(2)', 'SYNTAX');
  });
});

describe('scientific functions', () => {
  it('follows power precedence and associativity', () => {
    expect(calc('2^3^2')).toBe('512');
    expect(calc('−2^2')).toBe('-4');
    expect(calc('(−2)^2')).toBe('4');
    expect(calc('2^−1')).toBe('0.5');
    expect(calc('3²')).toBe('9');
    expect(calc('4⁻¹')).toBe('0.25');
  });

  it('evaluates trig in degrees and radians', () => {
    expect(calc('sin(30)')).toBe('0.5');
    expect(calc('cos(60)')).toBe('0.5');
    expect(calc('tan(45)')).toBe('1');
    expect(calc('sin(180)')).toBe('0');
    expect(calc('sin(π÷2)', 'rad')).toBe('1');
    expect(calc('cos(π)', 'rad')).toBe('-1');
  });

  it('evaluates inverse trig in the selected unit', () => {
    expect(calc('sin⁻¹(0.5)')).toBe('30');
    expect(calc('cos⁻¹(0)')).toBe('90');
    expect(calc('tan⁻¹(1)', 'rad')).toBe(formatResult(Math.PI / 4));
  });

  it('reports trig domain errors', () => {
    expectError('tan(90)', 'DOMAIN');
    expectError('tan(270)', 'DOMAIN');
    expectError('tan(π÷2)', 'DOMAIN', 'rad');
    expectError('sin⁻¹(2)', 'DOMAIN');
  });

  it('evaluates logs, roots and constants', () => {
    expect(calc('log(1000)')).toBe('3');
    expect(calc('ln(e)')).toBe('1');
    expect(calc('√(16)')).toBe('4');
    expect(calc('2π')).toBe(formatResult(2 * Math.PI));
    expect(calc('10^(2)')).toBe('100');
    expectError('log(0)', 'DOMAIN');
    expectError('ln(−1)', 'DOMAIN');
    expectError('√(−4)', 'DOMAIN');
  });

  it('computes factorials within range', () => {
    expect(calc('5!')).toBe('120');
    expect(calc('0!')).toBe('1');
    expect(calc('3!+1')).toBe('7');
    expectError('2.5!', 'DOMAIN');
    expectError('(−3)!', 'DOMAIN');
    expectError('171!', 'OVERFLOW');
  });
});

describe('result formatting', () => {
  it('uses re-parsable scientific notation for extremes', () => {
    expect(formatResult(1.5e20)).toBe('1.5E+20');
    expect(formatResult(2e-9)).toBe('2E-9');
    expect(calc('1.5E+20×2')).toBe('3E+20');
  });

  it('groups digits for display only', () => {
    expect(groupDigits('1234567.891')).toBe('1,234,567.891');
    expect(groupDigits('-1000')).toBe('-1,000');
    expect(groupDigits('1.5E+20')).toBe('1.5E+20');
  });
});
