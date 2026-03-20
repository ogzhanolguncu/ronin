import { useSyncExternalStore, useCallback } from "react";

type Theme = "light" | "dark";

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    if (localStorage.getItem("theme")) return;
    document.documentElement.classList.toggle("dark", mql.matches);
  };
  mql.addEventListener("change", handleChange);
  handleChange(); // sync current system preference immediately

  return () => {
    observer.disconnect();
    mql.removeEventListener("change", handleChange);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
