import type { RatesSnapshot } from './types';

export interface RatesCache {
  read(): RatesSnapshot | null;
  write(snapshot: RatesSnapshot): void;
}

export const RATES_CACHE_KEY = 'shadowcalc:rates:v1';

function isSnapshot(value: unknown): value is RatesSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<RatesSnapshot>;
  return (
    typeof v.base === 'string' &&
    typeof v.lastUpdated === 'string' &&
    typeof v.fetchedAt === 'string' &&
    !!v.provider &&
    typeof v.provider.name === 'string' &&
    !!v.rates &&
    typeof v.rates === 'object' &&
    Object.values(v.rates).every((r) => typeof r === 'number' && Number.isFinite(r) && r > 0)
  );
}

/**
 * Persists the last good snapshot in localStorage. Storage can be missing,
 * full or blocked (private mode, sandboxed iframes), so every access is
 * guarded and failures simply mean "no cache".
 */
export function createLocalStorageCache(key = RATES_CACHE_KEY): RatesCache {
  return {
    read() {
      try {
        const raw = globalThis.localStorage?.getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isSnapshot(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    write(snapshot) {
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify(snapshot));
      } catch {
        // Ignore quota / privacy-mode errors; caching is best-effort.
      }
    },
  };
}

export function createMemoryCache(initial: RatesSnapshot | null = null): RatesCache {
  let value = initial;
  return {
    read: () => value,
    write: (snapshot) => {
      value = snapshot;
    },
  };
}
