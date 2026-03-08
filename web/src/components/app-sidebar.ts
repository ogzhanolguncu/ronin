import { getState } from "../state";
import { BaseComponent } from "../lib/base-component";
import { html } from "../lib/html";
import { ICONS } from "../lib/icons";

export class AppSidebar extends BaseComponent {
  protected observe = true;

  protected events = {
    "click [data-nav]": (_e: Event, target: HTMLElement) => {
      const nav = target.dataset.nav!;
      this.emit("filter-change", nav === "recent" ? { recent: true } : { tag: null });
    },
    "click [data-tag]": (_e: Event, target: HTMLElement) => {
      this.emit("filter-change", { tag: target.dataset.tag });
    },
    "click .add-btn": () => {
      this.emit("open-modal");
    },
  };

  connectedCallback() {
    this.render();
    super.connectedCallback();
  }

  protected onStateChange() {
    this.render();
  }

  private render() {
    const { bookmarks, filterTag, filterRecent } = getState();

    const counts: Record<string, number> = {};
    bookmarks.forEach((b) =>
      b.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1))
    );
    const tags = Object.keys(counts).sort();

    this.innerHTML = html`
      <aside class="sidebar">
        <div class="logo-wrap">
          <div class="logo-row">
            <span class="logo-text">Safha</span><span class="logo-dot"></span>
          </div>
          <div class="logo-sub">صفحة</div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Library</div>
          <div class="nav-item ${!filterTag && !filterRecent ? "active" : ""}" data-nav="all">
            ${ICONS.grid}
            All bookmarks
            <span class="nav-count">${bookmarks.length}</span>
          </div>
          <div class="nav-item ${filterRecent ? "active" : ""}" data-nav="recent">
            ${ICONS.clock}
            Recent
          </div>
        </div>

        <div class="tags-section">
          <div class="nav-label" style="margin-bottom:8px">Tags</div>
          <div class="tags-inner">
            ${tags
              .map(
                (t) => `
              <div class="tag-item ${filterTag === t ? "active" : ""}" data-tag="${t}">
                <span class="tag-pip"></span>${t}
                <span class="tag-count-badge">${counts[t]}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>

        <div class="sidebar-foot">
          <button class="add-btn">
            ${ICONS.plus}
            Add bookmark
          </button>
        </div>
      </aside>
    `;
  }
}

customElements.define("app-sidebar", AppSidebar);
