import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  calcReducer,
  initialCalcState,
  previewResult,
  type CalcKey,
  type CalcState,
} from '../core/calculator/inputModel';
import type { AngleMode } from '../core/expression';

type Action = { key: CalcKey; angleMode: AngleMode };

const reducer = (state: CalcState, action: Action) => calcReducer(state, action.key, action.angleMode);

/** Maps a physical key to a calculator key. Returns an id for button feedback. */
export function keyFromKeyboard(event: KeyboardEvent, scientific: boolean): { key: CalcKey; id: string } | null {
  const k = event.key;
  if (/^[0-9]$/.test(k)) return { key: { type: 'digit', value: k }, id: k };
  switch (k) {
    case '.':
    case ',':
      return { key: { type: 'decimal' }, id: '.' };
    case '+':
      return { key: { type: 'operator', value: '+' }, id: '+' };
    case '-':
      return { key: { type: 'operator', value: '−' }, id: '−' };
    case '*':
    case 'x':
    case 'X':
      return { key: { type: 'operator', value: '×' }, id: '×' };
    case '/':
      return { key: { type: 'operator', value: '÷' }, id: '÷' };
    case '^':
      return scientific ? { key: { type: 'operator', value: '^' }, id: 'pow' } : null;
    case '(':
    case ')':
      return { key: { type: 'paren', value: k }, id: k };
    case '%':
      return { key: { type: 'postfix', value: '%' }, id: '%' };
    case '!':
      return scientific ? { key: { type: 'postfix', value: '!' }, id: 'fact' } : null;
    case 'Enter':
    case '=':
      return { key: { type: 'equals' }, id: '=' };
    case 'Backspace':
      return { key: { type: 'backspace' }, id: 'back' };
    case 'Escape':
    case 'Delete':
      return { key: { type: 'clear' }, id: 'clear' };
    case 'F9':
      return { key: { type: 'sign' }, id: 'sign' };
  }
  if (!scientific) return null;
  const sci: Record<string, [CalcKey, string]> = {
    s: [{ type: 'function', value: 'sin(' }, 'sin'],
    c: [{ type: 'function', value: 'cos(' }, 'cos'],
    t: [{ type: 'function', value: 'tan(' }, 'tan'],
    l: [{ type: 'function', value: 'ln(' }, 'ln'],
    g: [{ type: 'function', value: 'log(' }, 'log'],
    r: [{ type: 'function', value: '√(' }, 'sqrt'],
    p: [{ type: 'constant', value: 'π' }, 'pi'],
    e: [{ type: 'constant', value: 'e' }, 'e'],
  };
  const hit = sci[k];
  return hit ? { key: hit[0], id: hit[1] } : null;
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

export function useCalculator(angleMode: AngleMode, scientific: boolean, keyboardEnabled: boolean) {
  const [state, dispatch] = useReducer(reducer, initialCalcState);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const press = useCallback((key: CalcKey) => dispatch({ key, angleMode }), [angleMode]);

  useEffect(() => {
    if (!keyboardEnabled) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      // Let Enter/Space activate a focused button normally.
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return;
      const mapped = keyFromKeyboard(event, scientific);
      if (!mapped) return;
      event.preventDefault();
      dispatch({ key: mapped.key, angleMode });
      setPressedId(mapped.id);
      clearTimeout(timer);
      timer = setTimeout(() => setPressedId(null), 120);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [angleMode, scientific, keyboardEnabled]);

  return { state, press, preview: previewResult(state, angleMode), pressedId };
}
