import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { errMsg } from '../utils/notify';

/** Load data from an async function. Re-runs when deps change or reload() is called. */
export default function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    setLoading(true);
    fnRef
      .current()
      .then((d) => {
        if (live) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e);
          toast.error(errMsg(e), { id: 'fetch-error' });
        }
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}
