import {
  createLocalStorageCache,
  createRatesService,
  exchangeRateApiOpenProvider,
  frankfurterProvider,
  proxyProvider,
  type RatesProvider,
} from '../core/currency';

/**
 * Provider chain:
 *  1. VITE_RATES_PROXY_URL (optional) — the app's own server, which holds any
 *     secret API key. See /server and README "Currency configuration".
 *  2. ExchangeRate-API open access (no key, ~160 currencies, daily).
 *  3. Frankfurter / ECB (no key, ~30 currencies, working days) as fallback.
 */
const proxyUrl = import.meta.env.VITE_RATES_PROXY_URL?.trim();

const providers: RatesProvider[] = [
  ...(proxyUrl ? [proxyProvider(proxyUrl)] : []),
  exchangeRateApiOpenProvider(),
  frankfurterProvider(),
];

export const ratesService = createRatesService({
  providers,
  cache: createLocalStorageCache(),
});
