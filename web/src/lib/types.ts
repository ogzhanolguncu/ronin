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
  snapshot_status: string
  readable_status: string
  wayback_url: string
  title_snippet?: string
  description_snippet?: string
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

export interface Collection {
  id: number
  name: string
  slug: string
  color_id: number
  created_at: number
  updated_at: number
}

export interface CollectionsResponse {
  collections: Collection[]
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink"

export interface Highlight {
  id: number
  bookmark_id: number
  text: string
  note: string
  color: HighlightColor
  start_path: string
  start_offset: number
  end_path: string
  end_offset: number
  created_at: number
  updated_at: number
}

export interface HighlightsResponse {
  highlights: Highlight[]
}

export interface ReadableContent {
  html: string
  title: string
  source_url: string
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
