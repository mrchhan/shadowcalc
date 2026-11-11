import { useCallback, useEffect, useRef, useState } from 'react';
import { RatesUnavailableError, type RatesService } from '../core/currency';
import type { RatesResult } from '../core/currency';
import { ratesService } from '../services/rates';

export type RatesState =
  | { phase: 'loading' }
  | { phase: 'ready'; result: RatesResult; refreshing: boolean }
  | { phase: 'error'; message: string; details: string[]; refreshing: boolean };

/** Runs a rates request and maps the outcome to UI state. Never rejects. */
async function loadState(service: RatesService, force: boolean): Promise<RatesState> {
  try {
    return { phase: 'ready', result: await service.getRates({ force }), refreshing: false };
  } catch (err) {
    return {
      phase: 'error',
      message: err instanceof Error ? err.message : 'Exchange rates are unavailable',
      details: err instanceof RatesUnavailableError ? err.causes : [],
      refreshing: false,
    };
  }
}

export function useRates(service: RatesService = ratesService) {
  const [state, setState] = useState<RatesState>({ phase: 'loading' });
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    setState((s) => (s.phase === 'loading' ? s : { ...s, refreshing: true }));
    const next = await loadState(service, true);
    if (mounted.current) setState(next);
  }, [service]);

  useEffect(() => {
    mounted.current = true;
    loadState(service, false).then((next) => {
      if (mounted.current) setState(next);
    });
    const onOnline = () => void refresh();
    window.addEventListener('online', onOnline);
    return () => {
      mounted.current = false;
      window.removeEventListener('online', onOnline);
    };
  }, [service, refresh]);

  return { state, refresh };
}
