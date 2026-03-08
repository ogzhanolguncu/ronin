interface Bookmark {
  id: number;
  url: string;
  title: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

const app = document.getElementById("app")!;

async function loadBookmarks() {
  try {
    const res = await fetch("/bookmarks");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bookmarks: Bookmark[] = await res.json();
    render(bookmarks.bookmarks);
  } catch (err) {
    app.innerHTML = `<p>Failed to load bookmarks: ${err}</p>`;
  }
}

function render(bookmarks: Bookmark[]) {
  if (bookmarks.length === 0) {
    app.innerHTML = "<p>No bookmarks yet.</p>";
    return;
  }

  const list = bookmarks
    .map(
      (b) => `
    <li>
      <a href="${b.url}" target="_blank">${b.title || b.url}</a>
      ${b.is_read ? "<span>(read)</span>" : ""}
      ${b.is_archived ? "<span>(archived)</span>" : ""}
    </li>`
    )
    .join("");

  app.innerHTML = `
    <h1>Sanctum</h1>
    <ul>${list}</ul>
  `;
}

loadBookmarks();
