import { useId, useMemo } from 'react';
import {
  ConversionError,
  convertUnit,
  formatConverted,
  getCategory,
  parseNumericInput,
  UNIT_CATEGORIES,
  type CategoryId,
} from '../../core/units';
import { isString, oneOf, usePersistentState } from '../../hooks/usePersistentState';
import { SwapIcon } from '../icons/Icons';

const CATEGORY_IDS = UNIT_CATEGORIES.map((c) => c.id);

type Selection = Record<CategoryId, [string, string]>;

const defaultSelection = Object.fromEntries(UNIT_CATEGORIES.map((c) => [c.id, c.defaults])) as Selection;

const isSelection = (v: unknown): v is Selection =>
  !!v &&
  typeof v === 'object' &&
  UNIT_CATEGORIES.every((c) => {
    const pair = (v as Record<string, unknown>)[c.id];
    return (
      Array.isArray(pair) &&
      pair.length === 2 &&
      pair.every((id) => c.units.some((u) => u.id === id))
    );
  });

export function UnitConverter() {
  const [categoryId, setCategoryId] = usePersistentState<CategoryId>(
    'shadowcalc:units:category',
    'length',
    oneOf(CATEGORY_IDS),
  );
  const [selection, setSelection] = usePersistentState<Selection>('shadowcalc:units:selection', defaultSelection, isSelection);
  const [input, setInput] = usePersistentState<string>('shadowcalc:units:value', '1', isString);

  const ids = useId();
  const category = getCategory(categoryId);
  const [fromId, toId] = selection[categoryId];
  const from = category.units.find((u) => u.id === fromId)!;
  const to = category.units.find((u) => u.id === toId)!;

  const setUnits = (pair: [string, string]) => setSelection((s) => ({ ...s, [categoryId]: pair }));

  const outcome = useMemo(() => {
    const value = parseNumericInput(input);
    if (value === null) return { kind: 'empty' as const };
    if (Number.isNaN(value)) return { kind: 'error' as const, message: 'Enter a valid number, e.g. 12.5' };
    try {
      return { kind: 'ok' as const, value, result: convertUnit(value, categoryId, fromId, toId) };
    } catch (err) {
      return { kind: 'error' as const, message: err instanceof ConversionError ? err.message : 'Conversion failed' };
    }
  }, [input, categoryId, fromId, toId]);

  const allConversions = useMemo(() => {
    if (outcome.kind !== 'ok') return [];
    return category.units
      .filter((u) => u.id !== fromId)
      .map((u) => ({ unit: u, value: convertUnit(outcome.value, categoryId, fromId, u.id) }));
  }, [outcome, category, categoryId, fromId]);

  const errorId = `${ids}-error`;

  return (
    <div className="converter">
      <fieldset className="chips">
        <legend className="field__label">Category</legend>
        <div className="chips__list">
          {UNIT_CATEGORIES.map((c) => (
            <label key={c.id} className="chip">
              <input
                type="radio"
                name={`${ids}-category`}
                value={c.id}
                checked={c.id === categoryId}
                onChange={() => setCategoryId(c.id)}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="converter__grid">
        <div className="field-group">
          <label className="field__label" htmlFor={`${ids}-value`}>
            From
          </label>
          <div className={`field ${outcome.kind === 'error' ? 'has-error' : ''}`}>
            <input
              id={`${ids}-value`}
              className="field__input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-invalid={outcome.kind === 'error'}
              aria-describedby={outcome.kind === 'error' ? errorId : undefined}
              placeholder="Enter a value"
            />
            <select
              className="field__select"
              aria-label="From unit"
              value={fromId}
              onChange={(e) => setUnits([e.target.value, toId])}
            >
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="swap-button"
          onClick={() => setUnits([toId, fromId])}
          aria-label="Swap units"
          title="Swap units"
        >
          <SwapIcon />
        </button>

        <div className="field-group">
          <label className="field__label" htmlFor={`${ids}-result`}>
            To
          </label>
          <div className="field field--output">
            <output id={`${ids}-result`} className="field__input field__output" aria-live="polite">
              {outcome.kind === 'ok' ? formatConverted(outcome.result) : '—'}
            </output>
            <select
              className="field__select"
              aria-label="To unit"
              value={toId}
              onChange={(e) => setUnits([fromId, e.target.value])}
            >
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p id={errorId} className={`field__error ${outcome.kind === 'error' ? 'is-visible' : ''}`} role="alert">
        {outcome.kind === 'error' ? outcome.message : ''}
      </p>

      {outcome.kind === 'ok' && (
        <>
          <p className="converter__summary">
            <strong>
              {formatConverted(outcome.value)} {from.symbol}
            </strong>{' '}
            = <strong>{formatConverted(outcome.result)} {to.symbol}</strong>
          </p>

          <section className="all-conversions" aria-labelledby={`${ids}-all`}>
            <h2 id={`${ids}-all`} className="section-title">
              {formatConverted(outcome.value)} {from.symbol} in every {category.name.toLowerCase()} unit
            </h2>
            <ul>
              {allConversions.map(({ unit, value }) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    className={`all-conversions__item ${unit.id === toId ? 'is-selected' : ''}`}
                    onClick={() => setUnits([fromId, unit.id])}
                    aria-pressed={unit.id === toId}
                  >
                    <span className="all-conversions__value">{formatConverted(value)}</span>
                    <span className="all-conversions__unit">{unit.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
