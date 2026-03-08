import "./style.css";
import "./components/app-sidebar";
import "./components/bookmark-list";
import "./components/bookmark-item";
import "./components/bookmark-modal";
import "./components/confirm-dialog";
import "./components/toast-notification";

import { setState } from "./state";
import * as api from "./api";
import type { BookmarkList } from "./components/bookmark-list";
import type { BookmarkModal } from "./components/bookmark-modal";
import type { ConfirmDialog } from "./components/confirm-dialog";
import type { ToastNotification } from "./components/toast-notification";

const app = document.getElementById("app")!;

app.innerHTML = `
  <div class="app">
    <app-sidebar></app-sidebar>
    <bookmark-list></bookmark-list>
  </div>
  <bookmark-modal></bookmark-modal>
  <confirm-dialog></confirm-dialog>
  <toast-notification></toast-notification>
`;

// Component references
const modal = document.querySelector<BookmarkModal>("bookmark-modal")!;
const confirm = document.querySelector<ConfirmDialog>("confirm-dialog")!;
const toast = document.querySelector<ToastNotification>("toast-notification")!;
const list = document.querySelector<BookmarkList>("bookmark-list")!;

function showToast(msg: string) {
  toast.show(msg);
}

async function refreshBookmarks() {
  try {
    const res = await api.getBookmarks();
    setState({ bookmarks: res.bookmarks });
  } catch (err) {
    console.error("Failed to refresh bookmarks:", err);
  }
}

// ── Event listeners ──

// Filter changes (from sidebar or bookmark tags)
document.addEventListener("filter-change", ((e: CustomEvent) => {
  const { tag, recent } = e.detail;
  if (recent) {
    setState({ filterTag: null, filterRecent: true });
  } else {
    setState({ filterTag: tag ?? null, filterRecent: false });
  }
}) as EventListener);

// Open modal (add or edit)
document.addEventListener("open-modal", ((e: CustomEvent) => {
  modal.open(e.detail?.bookmark);
}) as EventListener);

// Bookmark saved
document.addEventListener("bookmark-saved", ((e: Event) => {
  const detail = (e as CustomEvent).detail;
  showToast(detail.message);
  refreshBookmarks();
}) as EventListener);

// Open confirm dialog (delete)
document.addEventListener("open-confirm", ((e: CustomEvent) => {
  const { bookmark } = e.detail;
  confirm.openForBookmark(bookmark.title, async () => {
    // Find the DOM element for animation
    const itemEl = document.querySelector(
      `[data-id="${bookmark.id}"]`
    ) as HTMLElement | null;
    if (itemEl) {
      itemEl.classList.add("removing");
    }

    setTimeout(async () => {
      try {
        await api.deleteBookmark(bookmark.id);
        showToast("Bookmark deleted");
        await refreshBookmarks();
      } catch (err) {
        showToast(`Error: ${err}`);
      }
    }, 180);
  });
}) as EventListener);

// Archive/unarchive bookmark
document.addEventListener("archive-bookmark", (async (e: Event) => {
  const { bookmark } = (e as CustomEvent).detail;
  try {
    await api.archiveBookmarks([{ id: bookmark.id, archived: !bookmark.archived }]);
    showToast(bookmark.archived ? "Unarchived" : "Archived");
    await refreshBookmarks();
  } catch (err) {
    showToast(`Error: ${err}`);
  }
}) as EventListener);

// Toast from modal (validation errors etc.)
document.addEventListener("show-toast", ((e: CustomEvent) => {
  showToast(e.detail.message);
}) as EventListener);

// ── Keyboard shortcuts ──
document.addEventListener("keydown", (e) => {
  const tag = (document.activeElement?.tagName ?? "").toUpperCase();
  const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

  if (e.key === "Escape") {
    modal.close();
    confirm.close();
    return;
  }

  if (inInput) return;

  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    modal.open();
  }

  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    list.focusSearch();
  }
});
