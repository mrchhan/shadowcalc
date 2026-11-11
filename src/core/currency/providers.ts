import type { RatesProvider, RatesSnapshot } from './types';

/**
 * Exchange-rate providers. Each one turns a vendor-specific response into a
 * `RatesSnapshot` and rejects anything that does not look like valid data,
 * so the UI can never display malformed or made-up rates.
 */

type FetchFn = typeof fetch;

const CURRENCY_CODE = /^[A-Z]{3}$/;

/** Validates and normalizes a rates map. Throws on anything suspicious. */
export function sanitizeRates(raw: unknown, base: string): Record<string, number> {
  if (!raw || typeof raw !== 'object') throw new Error('Response has no rates');
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    if (CURRENCY_CODE.test(code) && typeof value === 'number' && Number.isFinite(value) && value > 0) {
      rates[code] = value;
    }
  }
  rates[base] = 1;
  if (Object.keys(rates).length < 2) throw new Error('Response contained no usable rates');
  return rates;
}

async function getJson(fetchFn: FetchFn, url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetchFn(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error('Response was not valid JSON');
  }
}

const unixToIso = (seconds: unknown): string | undefined =>
  typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : undefined;

/**
 * ExchangeRate-API open-access endpoint. No key needed; rates update once a
 * day; attribution is required by its terms. ~160 currencies.
 * https://www.exchangerate-api.com/docs/free
 */
export function exchangeRateApiOpenProvider(fetchFn: FetchFn = fetch, base = 'USD'): RatesProvider {
  return {
    id: 'exchangerate-api-open',
    name: 'ExchangeRate-API',
    async fetchLatest(signal) {
      const data = (await getJson(fetchFn, `https://open.er-api.com/v6/latest/${base}`, signal)) as Record<
        string,
        unknown
      >;
      if (data.result !== 'success') {
        throw new Error(`Provider error: ${String(data['error-type'] ?? 'unknown')}`);
      }
      const lastUpdated = unixToIso(data.time_last_update_unix);
      if (!lastUpdated) throw new Error('Response is missing its update time');
      const snapshotBase = typeof data.base_code === 'string' ? data.base_code : base;
      return {
        base: snapshotBase,
        rates: sanitizeRates(data.rates, snapshotBase),
        provider: { id: this.id, name: this.name, url: 'https://www.exchangerate-api.com' },
        lastUpdated,
        lastUpdatedPrecision: 'datetime',
        nextUpdate: unixToIso(data.time_next_update_unix),
        fetchedAt: new Date().toISOString(),
      } satisfies RatesSnapshot;
    },
  };
}

/**
 * Frankfurter — open-source API serving European Central Bank reference
 * rates (~30 major currencies), published on working days around 16:00 CET.
 * Used as a fallback. https://frankfurter.dev
 */
export function frankfurterProvider(fetchFn: FetchFn = fetch, base = 'USD'): RatesProvider {
  return {
    id: 'frankfurter',
    name: 'Frankfurter (ECB reference rates)',
    async fetchLatest(signal) {
      const data = (await getJson(fetchFn, `https://api.frankfurter.dev/v1/latest?base=${base}`, signal)) as Record<
        string,
        unknown
      >;
      if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new Error('Response is missing its reference date');
      }
      const snapshotBase = typeof data.base === 'string' ? data.base : base;
      return {
        base: snapshotBase,
        rates: sanitizeRates(data.rates, snapshotBase),
        provider: { id: this.id, name: this.name, url: 'https://frankfurter.dev' },
        lastUpdated: data.date,
        lastUpdatedPrecision: 'date',
        fetchedAt: new Date().toISOString(),
      } satisfies RatesSnapshot;
    },
  };
}

/**
 * The app's own server endpoint (see /server). Used when a provider needs a
 * secret API key, which must never be shipped to the browser. The server
 * already returns a normalized snapshot; we re-validate it anyway.
 */
export function proxyProvider(url: string, fetchFn: FetchFn = fetch): RatesProvider {
  return {
    id: 'proxy',
    name: 'Server proxy',
    async fetchLatest(signal) {
      const data = (await getJson(fetchFn, url, signal)) as Partial<RatesSnapshot> & { error?: string };
      if (data.error) throw new Error(data.error);
      if (typeof data.base !== 'string' || !CURRENCY_CODE.test(data.base)) throw new Error('Invalid base currency');
      if (typeof data.lastUpdated !== 'string' || Number.isNaN(Date.parse(data.lastUpdated))) {
        throw new Error('Response is missing its update time');
      }
      if (!data.provider || typeof data.provider.name !== 'string' || typeof data.provider.url !== 'string') {
        throw new Error('Response is missing provider details');
      }
      return {
        base: data.base,
        rates: sanitizeRates(data.rates, data.base),
        provider: { id: data.provider.id ?? 'proxy', name: data.provider.name, url: data.provider.url },
        lastUpdated: data.lastUpdated,
        lastUpdatedPrecision: data.lastUpdatedPrecision === 'date' ? 'date' : 'datetime',
        nextUpdate: data.nextUpdate,
        fetchedAt: new Date().toISOString(),
      };
    },
  };
}
