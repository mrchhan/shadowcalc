/**
 * Server-side exchange-rate fetching for providers that need a secret key.
 * The key is read from the environment and never sent to the browser.
 */

const PROVIDER = {
  id: 'exchangerate-api',
  name: 'ExchangeRate-API',
  url: 'https://www.exchangerate-api.com',
};

const CODE = /^[A-Z]{3}$/;
const MAX_CACHE_MS = 60 * 60 * 1000;

let cache = null; // { snapshot, expiresAt }

export class RatesConfigError extends Error {}

function normalize(data) {
  if (data?.result !== 'success') {
    // ExchangeRate-API reports problems such as "invalid-key" or "quota-reached".
    throw new Error(`Provider error: ${data?.['error-type'] ?? 'unknown'}`);
  }
  const base = data.base_code;
  const raw = data.conversion_rates ?? data.rates;
  if (!CODE.test(base) || !raw || typeof raw !== 'object') throw new Error('Unexpected provider response');

  const rates = {};
  for (const [code, value] of Object.entries(raw)) {
    if (CODE.test(code) && typeof value === 'number' && Number.isFinite(value) && value > 0) rates[code] = value;
  }
  rates[base] = 1;

  const toIso = (s) => (Number.isFinite(s) && s > 0 ? new Date(s * 1000).toISOString() : undefined);
  const lastUpdated = toIso(data.time_last_update_unix);
  if (!lastUpdated) throw new Error('Provider response has no update time');

  return {
    base,
    rates,
    provider: PROVIDER,
    lastUpdated,
    lastUpdatedPrecision: 'datetime',
    nextUpdate: toIso(data.time_next_update_unix),
  };
}

/**
 * Returns a normalized snapshot, cached in memory until the provider's next
 * scheduled update (max 1 hour) to stay well inside free-tier quotas.
 */
export async function getRates({ apiKey, base = 'USD', fetchFn = fetch, now = Date.now } = {}) {
  if (!apiKey) throw new RatesConfigError('EXCHANGE_RATE_API_KEY is not configured on the server');

  if (cache && cache.expiresAt > now()) return cache.snapshot;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/${base}`;
    const response = await fetchFn(url, { signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok && !data) throw new Error(`HTTP ${response.status}`);
    const snapshot = normalize(data);

    const next = snapshot.nextUpdate ? Date.parse(snapshot.nextUpdate) : Infinity;
    cache = { snapshot, expiresAt: Math.min(now() + MAX_CACHE_MS, next) };
    return snapshot;
  } finally {
    clearTimeout(timer);
  }
}

export function clearRatesCache() {
  cache = null;
}
