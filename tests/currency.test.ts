import { describe, expect, it, vi } from 'vitest';
import {
  convertCurrency,
  createMemoryCache,
  createRatesService,
  crossRate,
  exchangeRateApiOpenProvider,
  frankfurterProvider,
  RatesUnavailableError,
  type RatesProvider,
  type RatesSnapshot,
} from '../src/core/currency';

const NOW = Date.parse('2026-11-08T10:00:00Z');

const snapshot = (overrides: Partial<RatesSnapshot> = {}): RatesSnapshot => ({
  base: 'USD',
  rates: { USD: 1, EUR: 0.9, PKR: 280 },
  provider: { id: 'test', name: 'Test provider', url: 'https://example.com' },
  lastUpdated: '2026-11-08T00:00:00.000Z',
  lastUpdatedPrecision: 'datetime',
  fetchedAt: new Date(NOW).toISOString(),
  ...overrides,
});

const okProvider = (snap: RatesSnapshot, name = 'OK'): RatesProvider => ({
  id: name,
  name,
  fetchLatest: vi.fn().mockResolvedValue(snap),
});

const failingProvider = (message: string, name = 'Failing'): RatesProvider => ({
  id: name,
  name,
  fetchLatest: vi.fn().mockRejectedValue(new Error(message)),
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('currency conversion', () => {
  it('computes cross rates through the base currency', () => {
    const snap = snapshot();
    expect(crossRate(snap, 'EUR', 'PKR')).toBeCloseTo(280 / 0.9, 10);
    expect(convertCurrency(10, snap, 'USD', 'PKR')).toBe(2800);
  });

  it('refuses unknown currencies and invalid amounts', () => {
    expect(() => convertCurrency(1, snapshot(), 'USD', 'XYZ')).toThrow(/No rate available for XYZ/);
    expect(() => convertCurrency(-1, snapshot(), 'USD', 'EUR')).toThrow(/negative/);
    expect(() => convertCurrency(Number.NaN, snapshot(), 'USD', 'EUR')).toThrow(/valid amount/);
  });
});

describe('rates service', () => {
  it('returns live rates and caches them', async () => {
    const cache = createMemoryCache();
    const service = createRatesService({ providers: [okProvider(snapshot())], cache, now: () => NOW });
    const result = await service.getRates();
    expect(result.status).toBe('live');
    expect(cache.read()?.rates.PKR).toBe(280);
  });

  it('falls back to the next provider when the first fails', async () => {
    const backup = okProvider(snapshot({ provider: { id: 'b', name: 'Backup', url: 'https://b.example' } }));
    const service = createRatesService({
      providers: [failingProvider('HTTP 503'), backup],
      cache: createMemoryCache(),
      now: () => NOW,
    });
    const result = await service.getRates();
    expect(result.status).toBe('live');
    expect(result.snapshot.provider.name).toBe('Backup');
  });

  it('serves stale cached rates, clearly flagged, when every provider fails', async () => {
    const old = snapshot({ fetchedAt: '2026-11-01T00:00:00.000Z', lastUpdated: '2026-11-01T00:00:00.000Z' });
    const service = createRatesService({
      providers: [failingProvider('HTTP 500', 'Primary')],
      cache: createMemoryCache(old),
      now: () => NOW,
    });
    const result = await service.getRates();
    expect(result.status).toBe('stale');
    expect(result.snapshot.lastUpdated).toBe('2026-11-01T00:00:00.000Z');
    expect(result.error).toContain('Primary: HTTP 500');
  });

  it('throws instead of inventing rates when there is no cache', async () => {
    const service = createRatesService({
      providers: [failingProvider('Network error')],
      cache: createMemoryCache(),
      now: () => NOW,
    });
    await expect(service.getRates()).rejects.toBeInstanceOf(RatesUnavailableError);
  });

  it('does not hit the network while offline', async () => {
    const provider = okProvider(snapshot());
    const service = createRatesService({
      providers: [provider],
      cache: createMemoryCache(snapshot({ fetchedAt: '2026-11-01T00:00:00.000Z' })),
      now: () => NOW,
      isOnline: () => false,
    });
    const result = await service.getRates();
    expect(result.status).toBe('stale');
    expect(result.error).toMatch(/offline/);
    expect(provider.fetchLatest).not.toHaveBeenCalled();
  });

  it('reuses a fresh cache without a network call, but refetches when forced', async () => {
    const provider = okProvider(snapshot());
    const service = createRatesService({
      providers: [provider],
      cache: createMemoryCache(snapshot({ fetchedAt: new Date(NOW - 60_000).toISOString() })),
      now: () => NOW,
    });
    expect((await service.getRates()).status).toBe('cached');
    expect(provider.fetchLatest).not.toHaveBeenCalled();
    expect((await service.getRates({ force: true })).status).toBe('live');
  });

  it('times out slow providers', async () => {
    const hanging: RatesProvider = {
      id: 'slow',
      name: 'Slow',
      fetchLatest: (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    };
    const service = createRatesService({ providers: [hanging], cache: createMemoryCache(), timeoutMs: 10 });
    await expect(service.getRates()).rejects.toMatchObject({ causes: ['Slow: Request timed out'] });
  });
});

describe('providers', () => {
  it('parses an ExchangeRate-API open-access response', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        result: 'success',
        base_code: 'USD',
        time_last_update_unix: 1762560000,
        time_next_update_unix: 1762646400,
        rates: { USD: 1, EUR: 0.86, PKR: 281.2, BAD: 'x' },
      }),
    );
    const snap = await exchangeRateApiOpenProvider(fetchFn).fetchLatest(new AbortController().signal);
    expect(snap.rates).toEqual({ USD: 1, EUR: 0.86, PKR: 281.2 });
    expect(snap.lastUpdated).toBe(new Date(1762560000 * 1000).toISOString());
    expect(snap.provider.url).toBe('https://www.exchangerate-api.com');
  });

  it('rejects error payloads and HTTP failures', async () => {
    const signal = new AbortController().signal;
    const errorPayload = vi.fn().mockResolvedValue(jsonResponse({ result: 'error', 'error-type': 'unsupported-code' }));
    await expect(exchangeRateApiOpenProvider(errorPayload).fetchLatest(signal)).rejects.toThrow(/unsupported-code/);

    const http500 = vi.fn().mockResolvedValue(new Response('oops', { status: 500 }));
    await expect(frankfurterProvider(http500).fetchLatest(signal)).rejects.toThrow(/HTTP 500/);
  });

  it('keeps Frankfurter dates date-only rather than inventing a time', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ amount: 1, base: 'USD', date: '2026-11-06', rates: { EUR: 0.86, GBP: 0.76 } }),
    );
    const snap = await frankfurterProvider(fetchFn).fetchLatest(new AbortController().signal);
    expect(snap.lastUpdated).toBe('2026-11-06');
    expect(snap.lastUpdatedPrecision).toBe('date');
    expect(snap.rates.USD).toBe(1);
  });
});
