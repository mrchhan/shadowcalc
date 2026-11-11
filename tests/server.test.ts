import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearRatesCache, getRates, RatesConfigError } from '../server/rates.mjs';

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const keyedResponse = {
  result: 'success',
  base_code: 'USD',
  time_last_update_unix: 1762560000,
  time_next_update_unix: 1762646400,
  conversion_rates: { USD: 1, EUR: 0.86, PKR: 281.2 },
};

describe('server rates proxy', () => {
  afterEach(() => clearRatesCache());

  it('refuses to run without a configured key', async () => {
    await expect(getRates({ apiKey: '' })).rejects.toBeInstanceOf(RatesConfigError);
  });

  it('normalizes the keyed ExchangeRate-API response', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok(keyedResponse));
    const snap = await getRates({ apiKey: 'secret', fetchFn, now: () => 1762560000 * 1000 });
    expect(snap.rates.PKR).toBe(281.2);
    expect(snap.provider.name).toBe('ExchangeRate-API');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/v6/secret/latest/USD');
  });

  it('caches until the next provider update', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok(keyedResponse));
    const now = () => 1762560000 * 1000;
    await getRates({ apiKey: 'k', fetchFn, now });
    await getRates({ apiKey: 'k', fetchFn, now });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('surfaces provider errors such as an invalid key', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({ result: 'error', 'error-type': 'invalid-key' }, 403));
    await expect(getRates({ apiKey: 'bad', fetchFn })).rejects.toThrow(/invalid-key/);
  });
});
