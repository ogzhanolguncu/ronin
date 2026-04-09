import { useSyncExternalStore } from "react";
import { URL_STATE_EVENT } from "./query-manager/url-state";

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(URL_STATE_EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(URL_STATE_EVENT, cb);
  };
}

function getPathname() {
  return window.location.pathname;
}

export function navigate(path: string, opts?: { replace?: boolean }) {
  if (opts?.replace) {
    window.history.replaceState(null, "", path);
  } else {
    window.history.pushState(null, "", path);
  }
  window.dispatchEvent(new Event(URL_STATE_EVENT));
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathname, () => "/");
}

type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;

export function compilePath(path: string): RegExp {
  const pattern = path.replace(/:(\w+)/g, "(?<$1>[^/]+)");
  return new RegExp(`^${pattern}$`);
}

export type RouteDef = {
  path: string;
  re: RegExp;
  render: (params: Record<string, string>) => React.ReactNode;
};

export function route<P extends string>(def: {
  path: P;
  render: (params: ExtractParams<P>) => React.ReactNode;
}): RouteDef {
  return {
    ...def,
    re: compilePath(def.path),
    render: def.render as RouteDef["render"],
  };
}
