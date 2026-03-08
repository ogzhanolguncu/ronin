import { getState, setState } from "../state";
import * as api from "../api";
import type { Bookmark } from "../types";
import { BaseComponent } from "../lib/base-component";
import { html } from "../lib/html";
import { ICONS } from "../lib/icons";
import "./bookmark-item";
import { BookmarkItem } from "./bookmark-item";

export class BookmarkList extends BaseComponent {
  protected observe = true;
  private debounceTimer?: number;

  protected events = {
    "input .search-input": (e: Event) => {
      const target = e.target as HTMLInputElement;
      const query = target.value.trim();
      clearTimeout(this.debounceTimer);

      if (!query) {
        setState({ searchQuery: "" });
        api.getBookmarks().then((res) => setState({ bookmarks: res.bookmarks }));
        return;
      }

      this.debounceTimer = window.setTimeout(async () => {
        setState({ searchQuery: query });
        try {
          const res = await api.searchBookmarks(query);
          setState({ bookmarks: res.bookmarks });
        } catch {
          // FTS search may fail on short queries, fall back to showing current
        }
      }, 250);
    },
    "change .sort-select": (e: Event) => {
      const target = e.target as HTMLSelectElement;
      setState({ sortMode: target.value as "newest" | "oldest" | "az" });
    },
  };

  async connectedCallback() {
    this.renderShell();
    super.connectedCallback();

    try {
      const res = await api.getBookmarks();
      setState({ bookmarks: res.bookmarks });
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  }

  protected onStateChange() {
    this.renderItems();
  }

  private renderShell() {
    this.innerHTML = html`
      <main class="main">
        <div class="topbar">
          <div class="search-wrap">
            ${ICONS.search}
            <input class="search-input" type="text" placeholder="Search bookmarks...">
          </div>
          <select class="sort-select">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">Title A–Z</option>
          </select>
        </div>
        <div class="list-header"></div>
        <div class="bm-list"></div>
      </main>
    `;
  }

  private getFiltered(): Bookmark[] {
    const { bookmarks, filterTag, filterRecent, sortMode } = getState();
    let items = [...bookmarks];

    if (filterTag) {
      items = items.filter((b) => b.tags.includes(filterTag));
    }

    if (filterRecent) {
      const weekAgo = Date.now() / 1000 - 7 * 86400;
      items = items.filter((b) => b.created_at >= weekAgo);
    }

    if (sortMode === "newest") {
      items.sort((a, b) => b.created_at - a.created_at);
    } else if (sortMode === "oldest") {
      items.sort((a, b) => a.created_at - b.created_at);
    } else {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }

  private renderItems() {
    const { filterTag, filterRecent, searchQuery } = getState();
    const items = this.getFiltered();

    const header = this.$(".list-header");
    const list = this.$(".bm-list");
    if (!header || !list) return;

    const label = filterTag
      ? `#${filterTag}`
      : filterRecent
        ? "Recent"
        : "All bookmarks";
    header.textContent = `${label} · ${items.length}`;

    if (!items.length) {
      list.innerHTML = html`
        <div class="empty">
          <div class="empty-glyph">◈</div>
          <div class="empty-title">${searchQuery ? "No results" : "No bookmarks yet"}</div>
          <div class="empty-sub">${searchQuery ? "Try a different search term" : "Press N or click Add bookmark"}</div>
        </div>
      `;
      return;
    }

    list.innerHTML = "";
    items.forEach((bm) => {
      const el = document.createElement("bookmark-item") as BookmarkItem;
      el.bookmark = bm;
      list.appendChild(el);
    });
  }

  focusSearch() {
    this.querySelector<HTMLInputElement>(".search-input")?.focus();
  }
}

customElements.define("bookmark-list", BookmarkList);
