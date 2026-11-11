import type { RatesSnapshot } from './types';

export class CurrencyConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyConversionError';
  }
}

/** Rate for 1 unit of `from` expressed in `to`, via the snapshot's base. */
export function crossRate(snapshot: RatesSnapshot, from: string, to: string): number {
  const fromRate = snapshot.rates[from];
  const toRate = snapshot.rates[to];
  if (fromRate === undefined) throw new CurrencyConversionError(`No rate available for ${from}`);
  if (toRate === undefined) throw new CurrencyConversionError(`No rate available for ${to}`);
  return toRate / fromRate;
}

export function convertCurrency(amount: number, snapshot: RatesSnapshot, from: string, to: string): number {
  if (!Number.isFinite(amount)) throw new CurrencyConversionError('Enter a valid amount');
  if (amount < 0) throw new CurrencyConversionError('Amount can’t be negative');
  return amount * crossRate(snapshot, from, to);
}

/** Money formatting with sensible precision for very small/large rates. */
export function formatMoney(value: number, currency: string, locale?: string): string {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs !== 0 && abs < 1 ? 6 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: Math.min(2, maximumFractionDigits),
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${value.toFixed(Math.min(maximumFractionDigits, 6))} ${currency}`;
  }
}

/** Plain rate formatting, e.g. "278.4512" or "0.003591". */
export function formatRate(rate: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(rate);
}

const displayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' });
  } catch {
    return null;
  }
})();

export function currencyName(code: string): string {
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Commonly used currencies shown at the top of the pickers. */
export const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'PKR', 'AED', 'SAR', 'AUD', 'CAD', 'CHF'];
