import { describe, expect, it } from 'vitest';
import {
  calcReducer,
  expressionText,
  initialCalcState,
  previewResult,
  type CalcKey,
  type CalcState,
} from '../src/core/calculator/inputModel';

/** Types a sequence of keys. Strings are shorthand for common keys. */
function press(...keys: (CalcKey | string)[]): CalcState {
  return keys.reduce<CalcState>((state, key) => {
    let k: CalcKey;
    if (typeof key !== 'string') k = key;
    else if (/^[0-9]$/.test(key)) k = { type: 'digit', value: key };
    else if (key === '.') k = { type: 'decimal' };
    else if (key === '=') k = { type: 'equals' };
    else if (key === '±') k = { type: 'sign' };
    else if (key === '⌫') k = { type: 'backspace' };
    else if (key === '(' || key === ')') k = { type: 'paren', value: key };
    else k = { type: 'operator', value: key as '+' };
    return calcReducer(state, k, 'deg');
  }, initialCalcState);
}

describe('calculator input model', () => {
  it('builds and evaluates an expression', () => {
    const state = press('1', '2', '+', '3', '×', '2', '=');
    expect(state.lastResult).toBe('18');
    expect(state.history[0]).toEqual({ expression: '12+3×2', result: '18' });
  });

  it('replaces a repeated operator instead of stacking it', () => {
    expect(expressionText(press('5', '+', '×', '2').tokens)).toBe('5×2');
  });

  it('allows a unary minus after multiplication', () => {
    expect(expressionText(press('5', '×', '−', '2').tokens)).toBe('5×−2');
  });

  it('ignores a second decimal point in the same number', () => {
    expect(expressionText(press('1', '.', '5', '.', '2').tokens)).toBe('1.52');
    expect(expressionText(press('.', '5').tokens)).toBe('0.5');
  });

  it('toggles the sign of the current number', () => {
    expect(expressionText(press('1', '2', '±').tokens)).toBe('−12');
    expect(expressionText(press('1', '2', '±', '±').tokens)).toBe('12');
    expect(expressionText(press('5', '+', '3', '±').tokens)).toBe('5−3');
    expect(expressionText(press('5', '−', '3', '±').tokens)).toBe('5+3');
  });

  it('continues from the previous result when an operator is pressed', () => {
    const state = press('6', '×', '7', '=', '+', '1', '=');
    expect(state.lastResult).toBe('43');
  });

  it('starts fresh when a digit follows a result', () => {
    expect(expressionText(press('2', '+', '2', '=', '9').tokens)).toBe('9');
  });

  it('only closes parentheses that are open', () => {
    expect(expressionText(press('2', ')').tokens)).toBe('2');
    expect(press('(', '2', '+', '3', ')', '×', '2', '=').lastResult).toBe('10');
  });

  it('keeps the expression and shows a message on error', () => {
    const state = press('8', '÷', '0', '=');
    expect(state.error).toBe('Cannot divide by zero');
    expect(expressionText(state.tokens)).toBe('8÷0');
    expect(state.evaluated).toBe(false);
  });

  it('backspace removes a whole function token', () => {
    const state = calcReducer(press('2', '+'), { type: 'function', value: 'sin(' }, 'deg');
    expect(expressionText(calcReducer(state, { type: 'backspace' }, 'deg').tokens)).toBe('2+');
  });

  it('shows a live preview for valid partial input', () => {
    expect(previewResult(press('2', '+', '3'), 'deg')).toBe('5');
    expect(previewResult(press('2', '+'), 'deg')).toBeNull();
  });
});
