import { useEffect } from 'react';
import { oneOf, usePersistentState } from './usePersistentState';

export type Theme = 'light' | 'dark';

const systemTheme = (): Theme =>
  globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = usePersistentState<Theme>('shadowcalc:theme', systemTheme(), oneOf(['light', 'dark']));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#070c18' : '#f4f6fa');
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
