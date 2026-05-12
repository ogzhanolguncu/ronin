import {
  useSyncExternalStore,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { urlState } from "@/lib/query-manager/url-state-instance";

type State = ReturnType<typeof urlState.get>;
type SetState = typeof urlState.set;

export function useUrlState(): [State, SetState];
export function useUrlState<T>(selector: (state: State) => T): T;
export function useUrlState(selector?: (state: State) => unknown) {
  // Cache the last derived value so repeated selector calls returning a
  // structurally-equal result keep referential identity (lets React bail
  // out of re-renders even when consumers pass a fresh arrow each render).
  const prevRef = useRef<{ value: unknown } | null>(null);

  const getSnapshot = useCallback(() => {
    const state = urlState._getSnapshot();
    if (!selector) return state;

    const next = selector(state);
    if (prevRef.current && Object.is(prevRef.current.value, next)) {
      return prevRef.current.value;
    }
    prevRef.current = { value: next };
    return next;
  }, [selector]);

  const snap = useSyncExternalStore(
    urlState.subscribe,
    getSnapshot,
    urlState._getServerSnapshot,
  );

  if (selector) return snap;
  return [snap, urlState.set];
}

export function useUrlStateLocal<T>(selector: (state: State) => T) {
  const synced = useUrlState(selector);
  const [local, setLocal] = useState(synced);

  useEffect(() => {
    setLocal(synced);
  }, [synced]);

  return [local, setLocal] as const;
}
