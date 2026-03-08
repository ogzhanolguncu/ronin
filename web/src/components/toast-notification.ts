import { BaseComponent } from "../lib/base-component";

export class ToastNotification extends BaseComponent {
  private timer?: number;

  connectedCallback() {
    super.connectedCallback();
    this.innerHTML = `<div class="toast"></div>`;
  }

  show(message: string, duration = 2000) {
    const el = this.$(".toast")!;
    el.textContent = message;
    el.classList.add("show");

    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      el.classList.remove("show");
    }, duration);
  }
}

customElements.define("toast-notification", ToastNotification);
