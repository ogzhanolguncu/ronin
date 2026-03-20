import { useEffect } from "react";

export function useCursorGlow() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty("--glow-x", `${e.clientX}px`);
        root.style.setProperty("--glow-y", `${e.clientY}px`);
      });
    }

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}
