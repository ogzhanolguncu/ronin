import type { Bookmark } from "../types";
import * as api from "../api";
import { BaseComponent } from "../lib/base-component";
import { html } from "../lib/html";
import { esc } from "../lib/utils";
import { ICONS } from "../lib/icons";

export class BookmarkModal extends BaseComponent {
  private editBookmark: Bookmark | null = null;
  private currentTags: string[] = [];

  protected events = {
    "click .overlay": (e: Event, target: HTMLElement) => {
      if (target === e.target) this.close();
    },
    "click .modal-close": () => this.close(),
    "click .btn-secondary": () => this.close(),
    "click .btn-primary": () => this.save(),
    "click .tag-chip button": (_e: Event, target: HTMLElement) => {
      const tag = target.dataset.tag;
      if (tag) {
        this.currentTags = this.currentTags.filter((t) => t !== tag);
        this.renderChips();
      }
    },
    "click .tags-input-wrap": () => {
      this.querySelector<HTMLInputElement>("#tag-input")?.focus();
    },
    "keydown #tag-input": (e: Event) => {
      const ke = e as KeyboardEvent;
      const input = ke.target as HTMLInputElement;

      if (ke.key === "Enter" || ke.key === ",") {
        ke.preventDefault();
        const val = input.value.trim().replace(",", "").toLowerCase();
        if (val && !this.currentTags.includes(val)) {
          this.currentTags.push(val);
          this.renderChips();
        }
        input.value = "";
      }
      if (ke.key === "Backspace" && !input.value && this.currentTags.length) {
        this.currentTags.pop();
        this.renderChips();
      }
    },
  };

  connectedCallback() {
    this.render();
    super.connectedCallback();
  }

  open(bookmark?: Bookmark) {
    this.editBookmark = bookmark ?? null;
    this.currentTags = bookmark ? [...bookmark.tags] : [];
    this.render();

    this.$(".overlay")?.classList.add("open");

    setTimeout(() => {
      this.querySelector<HTMLInputElement>("#f-url")?.focus();
    }, 80);
  }

  close() {
    this.$(".overlay")?.classList.remove("open");
  }

  private async save() {
    const url = this.querySelector<HTMLInputElement>("#f-url")!.value.trim();
    const title = this.querySelector<HTMLInputElement>("#f-title")!.value.trim();
    const notes = this.querySelector<HTMLTextAreaElement>("#f-notes")!.value.trim();
    const tags = this.currentTags.join(",");

    if (!url || !title) {
      this.emit("show-toast", { message: "URL and title are required" });
      return;
    }

    try {
      if (this.editBookmark) {
        await api.updateBookmark({
          id: this.editBookmark.id,
          url,
          title,
          description: this.editBookmark.description,
          notes,
          tags,
        });
        this.emit("bookmark-saved", { message: "Bookmark updated" });
      } else {
        await api.createBookmark({ url, title, description: "", notes, tags });
        this.emit("bookmark-saved", { message: "Bookmark saved" });
      }
      this.close();
    } catch (err) {
      this.emit("show-toast", { message: `Error: ${err}` });
    }
  }

  private renderChips() {
    const wrap = this.$(".tags-input-wrap");
    const input = this.querySelector<HTMLInputElement>("#tag-input");
    if (!wrap || !input) return;

    wrap.querySelectorAll(".tag-chip").forEach((el) => el.remove());
    this.currentTags.forEach((t) => {
      const chip = document.createElement("div");
      chip.className = "tag-chip";
      chip.innerHTML = `${esc(t)}<button type="button" data-tag="${esc(t)}">×</button>`;
      wrap.insertBefore(chip, input);
    });
  }

  private render() {
    const bm = this.editBookmark;
    this.innerHTML = html`
      <div class="overlay">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${bm ? "Edit bookmark" : "New bookmark"}</span>
            <button class="modal-close">${ICONS.close}</button>
          </div>
          <div class="form-group">
            <label class="form-label">URL</label>
            <input class="form-input" id="f-url" type="url" placeholder="https://" value="${bm ? esc(bm.url) : ""}">
          </div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="f-title" type="text" placeholder="Page title" value="${bm ? esc(bm.title) : ""}">
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-textarea" id="f-notes" placeholder="Why you saved this...">${bm ? esc(bm.notes) : ""}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tags</label>
            <div class="tags-input-wrap">
              <input class="tags-text-input" id="tag-input" placeholder="tag, press Enter">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary">Cancel</button>
            <button class="btn-primary">Save</button>
          </div>
        </div>
      </div>
    `;

    if (this.currentTags.length) {
      this.renderChips();
    }
  }
}

customElements.define("bookmark-modal", BookmarkModal);
