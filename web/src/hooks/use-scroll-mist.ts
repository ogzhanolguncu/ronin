import { useEffect, type RefObject } from "react";

export function useScrollMist(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop < 1;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      el.style.setProperty("--mist-top", atTop ? "1" : "0");
      el.style.setProperty("--mist-bottom", atBottom ? "1" : "0");
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);
}
