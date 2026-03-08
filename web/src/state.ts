import type { Bookmark } from "./types";

export interface AppState {
  bookmarks: Bookmark[];
  filterTag: string | null;
  filterRecent: boolean;
  sortMode: "newest" | "oldest" | "az";
  searchQuery: string;
}

type Listener = () => void;

let state: AppState = {
  bookmarks: [],
  filterTag: null,
  filterRecent: false,
  sortMode: "newest",
  searchQuery: "",
};

const listeners = new Set<Listener>();

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
