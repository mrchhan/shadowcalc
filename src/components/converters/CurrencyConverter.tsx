import { useId, useMemo } from 'react';
import {
  convertCurrency,
  crossRate,
  currencyName,
  CurrencyConversionError,
  formatMoney,
  formatRate,
  POPULAR_CURRENCIES,
  type RatesResult,
  type RatesSnapshot,
} from '../../core/currency';
import { parseNumericInput } from '../../core/units';
import { useRates } from '../../hooks/useRates';
import { isString, usePersistentState } from '../../hooks/usePersistentState';
import { AlertIcon, RefreshIcon, SwapIcon } from '../icons/Icons';

const isCode = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{3}$/.test(v);

function formatUpdated(snapshot: RatesSnapshot): string {
  if (snapshot.lastUpdatedPrecision === 'date') {
    const date = new Date(`${snapshot.lastUpdated}T12:00:00Z`);
    return `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date)} (reference date)`;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(snapshot.lastUpdated),
  );
}

function relativeTime(iso: string, now = Date.now()): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const minutes = Math.round((ms - now) / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

const STATUS_LABEL: Record<RatesResult['status'], string> = {
  live: 'Up to date',
  cached: 'Up to date',
  stale: 'Cached — not refreshed',
};

function CurrencySelect({
  id,
  label,
  value,
  codes,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  codes: string[];
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const popular = POPULAR_CURRENCIES.filter((c) => codes.includes(c));
  const options = (list: string[]) =>
    list.map((code) => (
      <option key={code} value={code}>
        {code} — {currencyName(code)}
      </option>
    ));
  // Keep the saved choice visible even if the current provider lacks it.
  const all = codes.includes(value) ? codes : [value, ...codes];

  return (
    <select
      id={id}
      className="field__select field__select--wide"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {popular.length > 0 && <optgroup label="Popular">{options(popular)}</optgroup>}
      <optgroup label="All currencies">{options(all)}</optgroup>
    </select>
  );
}

export function CurrencyConverter() {
  const { state, refresh } = useRates();
  const [amountInput, setAmountInput] = usePersistentState('shadowcalc:fx:amount', '100', isString);
  const [from, setFrom] = usePersistentState('shadowcalc:fx:from', 'USD', isCode);
  const [to, setTo] = usePersistentState('shadowcalc:fx:to', 'EUR', isCode);
  const ids = useId();

  const result = state.phase === 'ready' ? state.result : null;
  const snapshot = result?.snapshot ?? null;
  const refreshing = state.phase !== 'loading' && state.refreshing;

  const codes = useMemo(() => (snapshot ? Object.keys(snapshot.rates).sort() : []), [snapshot]);

  const conversion = useMemo(() => {
    const amount = parseNumericInput(amountInput);
    if (amount === null) return { kind: 'empty' as const };
    if (Number.isNaN(amount)) return { kind: 'error' as const, message: 'Enter a valid amount, e.g. 250.75' };
    if (amount < 0) return { kind: 'error' as const, message: 'Amount can’t be negative' };
    if (amount > 1e15) return { kind: 'error' as const, message: 'Amount is too large' };
    if (!snapshot) return { kind: 'pending' as const };
    try {
      return {
        kind: 'ok' as const,
        amount,
        value: convertCurrency(amount, snapshot, from, to),
        rate: crossRate(snapshot, from, to),
        inverse: crossRate(snapshot, to, from),
      };
    } catch (err) {
      return {
        kind: 'unsupported' as const,
        message:
          err instanceof CurrencyConversionError
            ? `${err.message} from ${snapshot.provider.name}. Choose another currency.`
            : 'Conversion failed',
      };
    }
  }, [amountInput, snapshot, from, to]);

  const amountError = conversion.kind === 'error' ? conversion.message : null;

  return (
    <div className="converter">
      <div className="converter__grid converter__grid--currency">
        <div className="field-group">
          <label className="field__label" htmlFor={`${ids}-amount`}>
            Amount
          </label>
          <div className={`field ${amountError ? 'has-error' : ''}`}>
            <input
              id={`${ids}-amount`}
              className="field__input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              aria-invalid={!!amountError}
              aria-describedby={amountError ? `${ids}-amount-error` : undefined}
              placeholder="0.00"
            />
          </div>
          <p id={`${ids}-amount-error`} className={`field__error ${amountError ? 'is-visible' : ''}`} role="alert">
            {amountError ?? ''}
          </p>
        </div>

        <div className="currency-pair">
          <div className="field-group">
            <label className="field__label" htmlFor={`${ids}-from`}>
              From
            </label>
            <CurrencySelect
              id={`${ids}-from`}
              label="From currency"
              value={from}
              codes={codes}
              onChange={setFrom}
              disabled={!snapshot}
            />
          </div>
          <button
            type="button"
            className="swap-button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label="Swap currencies"
            title="Swap currencies"
            disabled={!snapshot}
          >
            <SwapIcon />
          </button>
          <div className="field-group">
            <label className="field__label" htmlFor={`${ids}-to`}>
              To
            </label>
            <CurrencySelect
              id={`${ids}-to`}
              label="To currency"
              value={to}
              codes={codes}
              onChange={setTo}
              disabled={!snapshot}
            />
          </div>
        </div>
      </div>

      {state.phase !== 'error' && (
      <section className="fx-result" aria-live="polite" aria-busy={state.phase === 'loading'}>
        {state.phase === 'loading' && (
          <div className="skeleton-group" aria-label="Loading exchange rates">
            <div className="skeleton skeleton--lg" />
            <div className="skeleton skeleton--sm" />
          </div>
        )}

        {conversion.kind === 'ok' && (
          <>
            <p className="fx-result__from">{formatMoney(conversion.amount, from)} =</p>
            <p className="fx-result__value">{formatMoney(conversion.value, to)}</p>
            <p className="fx-result__rates">
              1 {from} = {formatRate(conversion.rate)} {to}
              <span aria-hidden> · </span>1 {to} = {formatRate(conversion.inverse)} {from}
            </p>
          </>
        )}

        {conversion.kind === 'unsupported' && <p className="notice notice--warning">{conversion.message}</p>}
        {conversion.kind === 'empty' && snapshot && <p className="fx-result__hint">Enter an amount to convert.</p>}
      </section>
      )}

      {state.phase === 'error' && (
        <div className="notice notice--error" role="alert">
          <AlertIcon />
          <div>
            <p className="notice__title">{state.message}</p>
            <p>
              No saved rates are available on this device, so no conversion is shown. Check your connection and try
              again.
            </p>
            {state.details.length > 0 && (
              <details className="notice__details">
                <summary>Technical details</summary>
                <ul>
                  {state.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </details>
            )}
            <button type="button" className="button" onClick={() => void refresh()} disabled={refreshing}>
              <RefreshIcon className={refreshing ? 'spin' : undefined} /> {refreshing ? 'Retrying…' : 'Try again'}
            </button>
          </div>
        </div>
      )}

      {result?.status === 'stale' && (
        <div className="notice notice--warning" role="status">
          <AlertIcon />
          <div>
            <p className="notice__title">Couldn’t refresh exchange rates</p>
            <p>
              Showing the last saved rates from {formatUpdated(result.snapshot)}. They may be out of date.
              {result.error ? ` (${result.error})` : ''}
            </p>
          </div>
        </div>
      )}

      {snapshot && result && (
        <footer className="fx-meta">
          <div className="fx-meta__info">
            <span className={`status-badge status-badge--${result.status}`}>
              <span className="status-badge__dot" aria-hidden />
              {STATUS_LABEL[result.status]}
            </span>
            <p>
              Rates by{' '}
              <a href={snapshot.provider.url} target="_blank" rel="noopener noreferrer">
                {snapshot.provider.name}
              </a>{' '}
              · Updated {formatUpdated(snapshot)}
              {snapshot.lastUpdatedPrecision === 'datetime' && (
                <span className="muted"> ({relativeTime(snapshot.lastUpdated)})</span>
              )}
            </p>
            <p className="muted small">
              Daily reference rates for information only — not a quote for trading or transfers.
              {snapshot.nextUpdate && result.status !== 'stale'
                ? ` Next provider update ${relativeTime(snapshot.nextUpdate)}.`
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh exchange rates"
          >
            <RefreshIcon className={refreshing ? 'spin' : undefined} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </footer>
      )}
    </div>
  );
}
