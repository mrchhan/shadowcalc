import type { RatesCache } from './cache';
import { RatesUnavailableError, type RatesProvider, type RatesResult, type RatesSnapshot } from './types';

export interface RatesServiceOptions {
  /** Tried in order; the first to succeed wins. */
  providers: RatesProvider[];
  cache: RatesCache;
  /** How long a fetched snapshot is reused without hitting the network. */
  maxAgeMs?: number;
  timeoutMs?: number;
  now?: () => number;
  isOnline?: () => boolean;
}

export interface RatesService {
  getRates(options?: { force?: boolean }): Promise<RatesResult>;
}

const DEFAULT_MAX_AGE = 60 * 60 * 1000; // 1 hour
const DEFAULT_TIMEOUT = 8000;

function describeError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') return 'Request timed out';
  if (err instanceof TypeError) return 'Network error';
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

async function fetchWithTimeout(provider: RatesProvider, timeoutMs: number): Promise<RatesSnapshot> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await provider.fetchLatest(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads exchange rates with a clear, honest status:
 *  1. A recent cached snapshot is reused (status `cached`).
 *  2. Otherwise each provider is tried in turn (status `live`).
 *  3. If all fail, the last good snapshot is returned as `stale` together
 *     with the reason — it is never presented as current.
 *  4. With no cache at all, a RatesUnavailableError is thrown. Rates are
 *     never invented.
 */
export function createRatesService(options: RatesServiceOptions): RatesService {
  const {
    providers,
    cache,
    maxAgeMs = DEFAULT_MAX_AGE,
    timeoutMs = DEFAULT_TIMEOUT,
    now = Date.now,
    isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
  } = options;

  let inFlight: Promise<RatesResult> | null = null;

  const isFresh = (snapshot: RatesSnapshot): boolean => {
    const age = now() - Date.parse(snapshot.fetchedAt);
    if (!(age >= 0 && age < maxAgeMs)) return false;
    // If the provider told us when new data lands, don't sit on old data past it.
    if (snapshot.nextUpdate && now() >= Date.parse(snapshot.nextUpdate)) return false;
    return true;
  };

  async function load(force: boolean): Promise<RatesResult> {
    const cached = cache.read();

    if (!force && cached && isFresh(cached)) {
      return { snapshot: cached, status: 'cached' };
    }

    const errors: string[] = [];

    if (!isOnline()) {
      errors.push('You appear to be offline');
    } else {
      for (const provider of providers) {
        try {
          const snapshot = await fetchWithTimeout(provider, timeoutMs);
          cache.write(snapshot);
          return { snapshot, status: 'live' };
        } catch (err) {
          errors.push(`${provider.name}: ${describeError(err)}`);
        }
      }
    }

    if (cached) {
      return { snapshot: cached, status: 'stale', error: errors.join(' · ') };
    }

    throw new RatesUnavailableError(
      providers.length === 0 ? 'No exchange-rate provider is configured' : 'Exchange rates are unavailable right now',
      errors,
    );
  }

  return {
    getRates({ force = false } = {}) {
      // De-duplicate concurrent requests (e.g. mount + "online" event).
      if (!inFlight) {
        inFlight = load(force).finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}
