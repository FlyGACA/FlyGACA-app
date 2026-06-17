import { useCallback, useEffect, useState } from 'react';

/**
 * Keeps a small set of string inputs in sync with the URL query string, so any
 * calculator setup is shareable/bookmarkable. Replaces the legacy FGCalc.urlState.
 *
 * Empty values are dropped from the URL. Hydration on mount reads ?key=value.
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T,
): [T, (key: keyof T, value: string) => void] {
  const [state, setState] = useState<T>(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const v = params.get(String(key));
      if (v !== null) next[key] = v as T[keyof T];
    }
    return next;
  });

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(state)) {
      if (value !== '') params.set(key, value);
    }
    const q = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
  }, [state]);

  const set = useCallback((key: keyof T, value: string) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return [state, set];
}
