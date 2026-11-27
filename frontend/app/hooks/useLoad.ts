import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from '../utils/apiError';

type LoadError<T> = {
  // For the console (never the full error: an axios error holds the Authorization header)
  log: string;
  // The toast, an English text wrapped in msg() (translated when shown)
  message: string;
  // Shown instead after a failed load, so the page leaves its loading state
  fallback: T;
};

// Loads data for a page: null while loading, then the data (or error.fallback after a toast).
// load must be stable (useCallback); it runs again whenever it changes. null = not ready yet (e.g. no board)
export function useLoad<T>(load: (() => Promise<T>) | null, error: LoadError<T>) {
  const [data, setData] = useState<T | null>(null);
  // The latest error texts without making reload change on every render
  const errorRef = useRef(error);
  useEffect(() => {
    errorRef.current = error;
  });

  const reload = useCallback(async () => {
    if (!load) return;
    try {
      setData(await load());
    } catch (err) {
      const { log, message, fallback } = errorRef.current;
      reportError(log, err, message);
      setData(fallback);
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, reload };
}
