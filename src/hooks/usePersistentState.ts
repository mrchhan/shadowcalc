import { useEffect, useState } from 'react';

/**
 * useState that survives reloads via localStorage. Storage failures (private
 * mode, quota, sandboxed frames) are ignored and the default is used.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (raw !== null && raw !== undefined) {
        const parsed: unknown = JSON.parse(raw);
        if (validate(parsed)) return parsed;
      }
    } catch {
      // fall through to default
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // best-effort only
    }
  }, [key, value]);

  return [value, setValue];
}

export const isString = (v: unknown): v is string => typeof v === 'string';
export const oneOf =
  <T extends string>(options: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (options as readonly string[]).includes(v);
