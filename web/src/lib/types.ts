export interface Bookmark {
  id: number
  url: string
  title: string
  description: string
  notes: string
  archived: boolean
  read: boolean
  favorite: boolean
  collection_id: number | null
  tags: string[]
  created_at: number
  updated_at: number
}

export interface PaginationMeta {
  page: number
  total_pages: number
  total_count: number
  has_more: boolean
}

export interface ListBookmarksResponse {
  bookmarks: Bookmark[]
  meta: PaginationMeta
}

export interface SearchBookmark extends Bookmark {
  title_snippet: string
  description_snippet: string
}

export interface SearchBookmarksResponse {
  bookmarks: SearchBookmark[]
  meta: PaginationMeta
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
