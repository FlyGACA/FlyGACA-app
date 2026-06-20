import { useEffect, useState } from 'react';
import { fetchJson } from './content';

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Loads JSON content at runtime with abort-on-unmount. Bump `reloadToken` to
 * re-fetch the same path (e.g. a retry button after a network error).
 */
export function useFetchJson<T>(path: string, reloadToken = 0): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    fetchJson<T>(path, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error as Error, loading: false });
      });
    return () => controller.abort();
  }, [path, reloadToken]);

  return state;
}
