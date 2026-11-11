/** A normalized set of exchange rates, regardless of which API produced it. */
export interface RatesSnapshot {
  /** ISO 4217 code all rates are quoted against (1 base = rates[X] X). */
  base: string;
  rates: Record<string, number>;
  provider: {
    id: string;
    name: string;
    /** Link required for attribution. */
    url: string;
  };
  /** When the provider says these rates were last updated (ISO 8601). */
  lastUpdated: string;
  /**
   * Precision of `lastUpdated`. Some providers (e.g. Frankfurter / ECB)
   * publish a reference *date* rather than a timestamp; the UI must then
   * show only the date rather than inventing a time.
   */
  lastUpdatedPrecision: 'datetime' | 'date';
  /** When the provider expects to publish the next update, if known. */
  nextUpdate?: string;
  /** When this app fetched the snapshot (ISO 8601). */
  fetchedAt: string;
}

export interface RatesProvider {
  id: string;
  name: string;
  fetchLatest(signal: AbortSignal): Promise<RatesSnapshot>;
}

/**
 * - `live`:   fetched from the provider just now.
 * - `cached`: fetched recently and still within its validity window, so no
 *             network call was needed.
 * - `stale`:  a refresh was attempted and failed; showing the last good
 *             snapshot, which may be out of date.
 */
export type RatesStatus = 'live' | 'cached' | 'stale';

export interface RatesResult {
  snapshot: RatesSnapshot;
  status: RatesStatus;
  /** Why the refresh failed, when status is `stale`. */
  error?: string;
}

export class RatesUnavailableError extends Error {
  constructor(
    message: string,
    readonly causes: string[] = [],
  ) {
    super(message);
    this.name = 'RatesUnavailableError';
  }
}
