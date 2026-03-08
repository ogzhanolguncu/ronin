import type { Bookmark } from "../types";
import { BaseComponent } from "../lib/base-component";
import { html } from "../lib/html";
import { esc, formatDate } from "../lib/utils";
import { ICONS } from "../lib/icons";

export class BookmarkItem extends BaseComponent {
  private _bookmark?: Bookmark;

  protected events = {
    "click [data-action='edit']": () => {
      if (this._bookmark) this.emit("open-modal", { bookmark: this._bookmark });
    },
    "click [data-action='delete']": () => {
      if (this._bookmark) this.emit("open-confirm", { bookmark: this._bookmark });
    },
    "click [data-action='archive']": () => {
      if (this._bookmark) this.emit("archive-bookmark", { bookmark: this._bookmark });
    },
    "click [data-action='notes']": () => {
      const panel = this.querySelector(".bm-notes-panel") as HTMLElement | null;
      if (panel) panel.hidden = !panel.hidden;
    },
    "click .bm-tag": (_e: Event, target: HTMLElement) => {
      this.emit("filter-change", { tag: target.dataset.tag });
    },
  };

  set bookmark(bm: Bookmark) {
    this._bookmark = bm;
    this.render();
  }

  get bookmark(): Bookmark | undefined {
    return this._bookmark;
  }

  private render() {
    const b = this._bookmark;
    if (!b) return;

    let hostname = "";
    try {
      hostname = new URL(b.url).hostname;
    } catch {
      hostname = b.url;
    }

    this.innerHTML = html`
      <div class="bm-item" data-id="${b.id}">
        <div class="bm-header">
          <img class="bm-favicon" src="https://www.google.com/s2/favicons?domain=${esc(hostname)}&sz=32" alt="" />
          <a class="bm-title" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>
        </div>
        <span class="bm-url">${esc(hostname)}</span>
        ${b.description ? `<div class="bm-desc">${esc(b.description)}</div>` : ""}
        <div class="bm-meta">
          ${b.tags.length ? b.tags.map((t) => `<span class="bm-tag" data-tag="${esc(t)}">#${esc(t)}</span>`).join("") + `<span class="bm-sep">·</span>` : ""}
          <span class="bm-date">${formatDate(b.created_at)}</span>
        </div>
        <div class="bm-actions">
          <button class="bm-text-action" data-action="edit">Edit</button>
          <button class="bm-text-action" data-action="archive">${b.archived ? "Unarchive" : "Archive"}</button>
          <button class="bm-text-action bm-text-action--danger" data-action="delete">Remove</button>
          ${b.notes ? `<span class="bm-sep">|</span><button class="bm-text-action bm-notes-btn" data-action="notes">${ICONS.notes} Notes</button>` : ""}
        </div>
        ${b.notes ? `<div class="bm-notes-panel" hidden>${esc(b.notes)}</div>` : ""}
      </div>
    `;
  }
}

customElements.define("bookmark-item", BookmarkItem);
