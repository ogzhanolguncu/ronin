export interface Bookmark {
  id: number;
  url: string;
  title: string;
  notes: string;
  description: string;
  archived: boolean;
  read: boolean;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface ListBookmarksResponse {
  bookmarks: Bookmark[];
  meta: {
    cursor: number | null;
  };
}

export interface CreateBookmarkRequest {
  url: string;
  title: string;
  description: string;
  notes: string;
  tags: string;
}

export interface UpdateBookmarkRequest {
  id: number;
  url: string;
  title: string;
  description: string;
  notes: string;
  tags: string;
}

export interface DeleteBookmarkRequest {
  ids: number[];
}

export interface ArchiveEntry {
  id: number;
  archived: boolean;
}

export interface ReadEntry {
  id: number;
  read: boolean;
}
