import { BaseComponent } from "../lib/base-component";
import { esc } from "../lib/utils";

export class ConfirmDialog extends BaseComponent {
  private onConfirmCb?: () => void;

  protected events = {
    "click [data-action='cancel']": () => this.close(),
    "click [data-action='confirm']": () => {
      this.onConfirmCb?.();
      this.close();
    },
    "click .confirm-overlay": (e: Event, target: HTMLElement) => {
      if (target === e.target) this.close();
    },
  };

  connectedCallback() {
    super.connectedCallback();
    this.innerHTML = `
      <div class="confirm-overlay">
        <div class="confirm-box">
          <div class="confirm-msg"></div>
          <div class="confirm-actions">
            <button class="btn-secondary" data-action="cancel">Cancel</button>
            <button class="btn-danger" data-action="confirm">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  open(message: string, onConfirm: () => void) {
    this.onConfirmCb = onConfirm;
    const msg = this.$(".confirm-msg");
    if (msg) msg.innerHTML = message;
    this.$(".confirm-overlay")?.classList.add("open");
  }

  close() {
    this.$(".confirm-overlay")?.classList.remove("open");
    this.onConfirmCb = undefined;
  }

  openForBookmark(title: string, onConfirm: () => void) {
    this.open(`Delete <strong>${esc(title)}</strong>?`, onConfirm);
  }
}

customElements.define("confirm-dialog", ConfirmDialog);
