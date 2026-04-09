import { z } from "zod/mini";

type SetState<T> = (
  update: Partial<T> | ((prev: T) => Partial<T>),
  opts?: { replace?: boolean },
) => void;

type UrlStateStore<T> = {
  get: () => T;
  set: SetState<T>;
  subscribe: (cb: () => void) => () => void;
  /** @internal */ _getSnapshot: () => T;
  /** @internal */ _getServerSnapshot: () => T;
  /** @internal */ _schema: z.ZodMiniObject;
};

export const URL_STATE_EVENT = "url-state";

// Strips the ZodMiniDefault wrapper to get the underlying type for coercion.
// WARNING: `_zod.def.innerType` is a Zod internal API — may break on Zod upgrades.
function unwrapDefault(schema: z.ZodMiniType): z.ZodMiniType {
  if (schema instanceof z.ZodMiniDefault) {
    return (schema as any)._zod.def.innerType;
  }
  return schema;
}

// Reads raw URL params and coerces them to the types expected by the schema
// (numbers, booleans, arrays, etc.) before Zod validation fills in defaults.
function coerceFromParams(
  searchParams: URLSearchParams,
  shape: Record<string, z.ZodMiniType>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(shape)) {
    const inner = unwrapDefault(shape[key]);

    if (inner instanceof z.ZodMiniArray) {
      const values = searchParams.getAll(key);
      if (values.length > 0) result[key] = values;
      continue;
    }

    const raw = searchParams.get(key);
    if (raw === null) continue;

    if (inner instanceof z.ZodMiniNumber) {
      const n = Number(raw);
      if (!Number.isNaN(n)) result[key] = n;
    } else if (inner instanceof z.ZodMiniBoolean) {
      result[key] = raw === "true";
    } else if (inner instanceof z.ZodMiniNullable) {
      result[key] = raw;
    } else {
      result[key] = raw;
    }
  }

  return result;
}

function serializeToParams(
  state: Record<string, unknown>,
  defaults: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(state)) {
    const def = defaults[key];

    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (Array.isArray(def) && JSON.stringify(value) === JSON.stringify(def))
        continue;
      for (const v of value) params.append(key, String(v));
      continue;
    }

    if (value === def) continue;

    if (typeof value === "boolean") {
      params.set(key, value ? "true" : "false");
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

export function createUrlState<S extends z.ZodMiniObject>(schema: S) {
  type State = z.infer<S>;

  const defaults = schema.parse({}) as Record<string, unknown>;
  // WARNING: `.shape` is a Zod internal API — may break on Zod upgrades.
  const shape = (schema as any).shape as Record<string, z.ZodMiniType>;

  // "\0" is a sentinel that can never equal `window.location.search`,
  // ensuring the first call to getSnapshot() always parses the URL.
  let cachedSearch = "\0";
  let cachedState: State;

  function getSnapshot(): State {
    const search = window.location.search;
    if (search === cachedSearch) return cachedState;

    cachedSearch = search;
    const params = new URLSearchParams(search);
    const coerced = coerceFromParams(params, shape);
    cachedState = schema.parse(coerced) as State;

    return cachedState;
  }

  function get(): State {
    return getSnapshot();
  }

  const set: SetState<State> = (update, opts) => {
    const current = getSnapshot();
    const partial =
      typeof update === "function"
        ? (update as (prev: State) => Partial<State>)(current)
        : update;
    const next = { ...current, ...partial };

    const params = serializeToParams(next as Record<string, unknown>, defaults);
    const search = params.size > 0 ? `?${params}` : "";
    const url = window.location.pathname + search + window.location.hash;

    if (opts?.replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }

    cachedSearch = "\0";
    window.dispatchEvent(new Event(URL_STATE_EVENT));
  };

  function subscribe(cb: () => void) {
    window.addEventListener("popstate", cb);
    window.addEventListener(URL_STATE_EVENT, cb);
    return () => {
      window.removeEventListener("popstate", cb);
      window.removeEventListener(URL_STATE_EVENT, cb);
    };
  }

  const getServerSnapshot = () => defaults as State;

  return {
    get,
    set,
    subscribe,
    _getSnapshot: getSnapshot,
    _getServerSnapshot: getServerSnapshot,
    _schema: schema,
  } as UrlStateStore<State>;
}
