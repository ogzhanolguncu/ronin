import { subscribe } from "../state";

type EventHandler = (e: Event, target: HTMLElement) => void;
type EventsMap = Record<string, EventHandler>;

export abstract class BaseComponent extends HTMLElement {
  protected events: EventsMap = {};
  protected observe = false;

  private _unsub?: () => void;
  private _bound = new Map<string, EventListener>();

  connectedCallback() {
    // Group events by event type
    const byType = new Map<string, [string, EventHandler][]>();
    for (const [key, handler] of Object.entries(this.events)) {
      const spaceIdx = key.indexOf(" ");
      const type = spaceIdx === -1 ? key : key.slice(0, spaceIdx);
      const selector = spaceIdx === -1 ? "" : key.slice(spaceIdx + 1);
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push([selector, handler]);
    }

    for (const [type, handlers] of byType) {
      const listener = (e: Event) => {
        const target = e.target as HTMLElement;
        for (const [selector, handler] of handlers) {
          if (!selector) {
            handler(e, target);
            return;
          }
          const matched = target.closest<HTMLElement>(selector);
          if (matched) {
            handler(e, matched);
            return;
          }
        }
      };
      this._bound.set(type, listener);
      this.addEventListener(type, listener);
    }

    if (this.observe) {
      this._unsub = subscribe(() => this.onStateChange());
    }
  }

  disconnectedCallback() {
    for (const [type, listener] of this._bound) {
      this.removeEventListener(type, listener);
    }
    this._bound.clear();
    this._unsub?.();
  }

  protected onStateChange() {}

  protected emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  protected $(selector: string) {
    return this.querySelector(selector);
  }

  protected $$<T extends Element = Element>(selector: string) {
    return this.querySelectorAll<T>(selector);
  }
}
