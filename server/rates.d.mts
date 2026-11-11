export class RatesConfigError extends Error {}

export interface ServerRatesSnapshot {
  base: string;
  rates: Record<string, number>;
  provider: { id: string; name: string; url: string };
  lastUpdated: string;
  lastUpdatedPrecision: 'datetime';
  nextUpdate?: string;
}

export function getRates(options?: {
  apiKey?: string;
  base?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}): Promise<ServerRatesSnapshot>;

export function clearRatesCache(): void;
