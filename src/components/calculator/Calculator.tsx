import type { ReactNode } from 'react';
import type { CalcKey } from '../../core/calculator/inputModel';
import { useCalculator } from '../../hooks/useCalculator';
import { oneOf, usePersistentState } from '../../hooks/usePersistentState';
import type { AngleMode } from '../../core/expression';
import { BackspaceIcon, HistoryIcon, KeyboardIcon } from '../icons/Icons';
import { Display } from './Display';
import { Key, type KeyVariant } from './Key';

interface KeyDef {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  variant?: KeyVariant;
  span?: number;
  key: CalcKey;
}

const digit = (d: string): KeyDef => ({ id: d, label: d, key: { type: 'digit', value: d } });

const STANDARD_KEYS: KeyDef[] = [
  { id: 'clear', label: 'AC', ariaLabel: 'All clear', variant: 'action', key: { type: 'clear' } },
  { id: 'back', label: <BackspaceIcon />, ariaLabel: 'Backspace', variant: 'action', key: { type: 'backspace' } },
  { id: '(', label: '(', ariaLabel: 'Open parenthesis', variant: 'action', key: { type: 'paren', value: '(' } },
  { id: ')', label: ')', ariaLabel: 'Close parenthesis', variant: 'action', key: { type: 'paren', value: ')' } },
  digit('7'),
  digit('8'),
  digit('9'),
  { id: '÷', label: '÷', ariaLabel: 'Divide', variant: 'operator', key: { type: 'operator', value: '÷' } },
  digit('4'),
  digit('5'),
  digit('6'),
  { id: '×', label: '×', ariaLabel: 'Multiply', variant: 'operator', key: { type: 'operator', value: '×' } },
  digit('1'),
  digit('2'),
  digit('3'),
  { id: '−', label: '−', ariaLabel: 'Subtract', variant: 'operator', key: { type: 'operator', value: '−' } },
  { id: 'sign', label: '±', ariaLabel: 'Change sign', key: { type: 'sign' } },
  digit('0'),
  { id: '.', label: '.', ariaLabel: 'Decimal point', key: { type: 'decimal' } },
  { id: '+', label: '+', ariaLabel: 'Add', variant: 'operator', key: { type: 'operator', value: '+' } },
  { id: '%', label: '%', ariaLabel: 'Percent', variant: 'action', key: { type: 'postfix', value: '%' } },
  { id: '=', label: '=', ariaLabel: 'Equals', variant: 'equals', span: 3, key: { type: 'equals' } },
];

const fn = (id: string, label: ReactNode, ariaLabel: string, value: string): KeyDef => ({
  id,
  label,
  ariaLabel,
  variant: 'sci',
  key: { type: 'function', value },
});

// Laid out on a 5-column grid; the Degrees/Radians toggle fills the first two cells.
const SCIENTIFIC_KEYS: KeyDef[] = [
  { id: 'pi', label: 'π', ariaLabel: 'Pi', variant: 'sci', key: { type: 'constant', value: 'π' } },
  { id: 'e', label: 'e', ariaLabel: "Euler's number", variant: 'sci', key: { type: 'constant', value: 'e' } },
  { id: 'fact', label: 'x!', ariaLabel: 'Factorial', variant: 'sci', key: { type: 'postfix', value: '!' } },
  fn('sin', 'sin', 'Sine', 'sin('),
  fn('cos', 'cos', 'Cosine', 'cos('),
  fn('tan', 'tan', 'Tangent', 'tan('),
  fn('ln', 'ln', 'Natural logarithm', 'ln('),
  fn('log', 'log', 'Logarithm base 10', 'log('),
  fn('asin', <>sin<sup>−1</sup></>, 'Inverse sine', 'sin⁻¹('),
  fn('acos', <>cos<sup>−1</sup></>, 'Inverse cosine', 'cos⁻¹('),
  fn('atan', <>tan<sup>−1</sup></>, 'Inverse tangent', 'tan⁻¹('),
  fn('exp', <>e<sup>x</sup></>, 'e to the power of x', 'e^('),
  fn('pow10', <>10<sup>x</sup></>, '10 to the power of x', '10^('),
  { id: 'sq', label: <>x<sup>2</sup></>, ariaLabel: 'Square', variant: 'sci', key: { type: 'postfix', value: '²' } },
  { id: 'pow', label: <>x<sup>y</sup></>, ariaLabel: 'Power', variant: 'sci', key: { type: 'operator', value: '^' } },
  fn('sqrt', '√x', 'Square root', '√('),
  fn('cbrt', '∛x', 'Cube root', '∛('),
  { id: 'inv', label: '1/x', ariaLabel: 'Reciprocal', variant: 'sci', key: { type: 'postfix', value: '⁻¹' } },
];

const SHORTCUTS: [string, string][] = [
  ['0–9  .', 'Digits and decimal point'],
  ['+  −  *  /', 'Add, subtract, multiply, divide'],
  ['( )  %', 'Parentheses and percent'],
  ['Enter  =', 'Calculate'],
  ['Backspace', 'Delete last entry'],
  ['Esc  Delete', 'Clear all'],
  ['F9', 'Change sign'],
];

const SCI_SHORTCUTS: [string, string][] = [
  ['^  !', 'Power and factorial'],
  ['s  c  t', 'sin, cos, tan'],
  ['l  g  r', 'ln, log, square root'],
  ['p  e', 'π and e'],
];

interface CalculatorProps {
  scientific: boolean;
}

export function Calculator({ scientific }: CalculatorProps) {
  const [angleMode, setAngleMode] = usePersistentState<AngleMode>('shadowcalc:angle', 'deg', oneOf(['deg', 'rad']));
  const { state, press, preview, pressedId } = useCalculator(angleMode, scientific, true);

  const renderKey = (def: KeyDef) => (
    <Key
      key={def.id}
      id={def.id}
      label={def.label}
      ariaLabel={def.ariaLabel}
      variant={def.variant}
      span={def.span}
      pressed={pressedId === def.id}
      onPress={() => press(def.key)}
    />
  );

  return (
    <div className={`calc ${scientific ? 'calc--scientific' : ''}`}>
      <div className="calc__main">
        <Display state={state} preview={preview} angleLabel={scientific ? angleMode.toUpperCase() : undefined} />

        <div className="calc__pads">
          {scientific && (
            <div className="sci-pad" role="group" aria-label="Scientific functions">
              <div className="angle-toggle" role="radiogroup" aria-label="Angle unit">
                {(['deg', 'rad'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={angleMode === mode}
                    className="angle-toggle__option"
                    onClick={() => setAngleMode(mode)}
                    title={mode === 'deg' ? 'Degrees' : 'Radians'}
                  >
                    {mode === 'deg' ? 'Degrees' : 'Radians'}
                  </button>
                ))}
              </div>
              {SCIENTIFIC_KEYS.map(renderKey)}
            </div>
          )}

          <div className="keypad" role="group" aria-label="Keypad">
            {STANDARD_KEYS.map(renderKey)}
          </div>
        </div>
      </div>

      <aside className="calc__side">
        <details className="panel" open>
          <summary className="panel__summary">
            <HistoryIcon /> History
            {state.history.length > 0 && <span className="panel__count">{state.history.length}</span>}
          </summary>
          {state.history.length === 0 ? (
            <p className="panel__empty">Your calculations will appear here.</p>
          ) : (
            <>
              <ol className="history">
                {state.history.map((entry, i) => (
                  <li key={`${entry.expression}-${i}`}>
                    <button
                      type="button"
                      className="history__item"
                      onClick={() => press({ type: 'recall', value: entry.result })}
                      title="Use this result"
                    >
                      <span className="history__expr">{entry.expression}</span>
                      <span className="history__result">= {entry.result}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" className="link-button" onClick={() => press({ type: 'clearHistory' })}>
                Clear history
              </button>
            </>
          )}
        </details>

        <details className="panel">
          <summary className="panel__summary">
            <KeyboardIcon /> Keyboard shortcuts
          </summary>
          <dl className="shortcuts">
            {[...SHORTCUTS, ...(scientific ? SCI_SHORTCUTS : [])].map(([keys, desc]) => (
              <div key={keys} className="shortcuts__row">
                <dt>
                  {keys.split('  ').map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </dt>
                <dd>{desc}</dd>
              </div>
            ))}
          </dl>
        </details>
      </aside>
    </div>
  );
}
