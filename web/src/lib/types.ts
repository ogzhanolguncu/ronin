export type Bookmark = {
  id: number
  url: string
  title: string
  notes: string
  description: string
  archived: boolean
  read: boolean
  tags: string[]
  created_at: number
  updated_at: number
}

export type ListBookmarksResponse = {
  bookmarks: Bookmark[]
  meta: {
    cursor: number | null
  }
}

export type CreateBookmarkRequest = {
  url: string
  title: string
  description: string
  notes: string
  tags: string
}

export type CreateBookmarkResponse = { id: number }

export type UpdateBookmarkRequest = {
  id: number
  url: string
  title: string
  description: string
  notes: string
  tags: string
}

export type DeleteBookmarkRequest = {
  ids: number[]
}

export type ArchiveEntry = {
  id: number
  archived: boolean
}

export type ReadEntry = {
  id: number
  read: boolean
}

/** Shape used by the service layer for create/update operations. */
export type CreateBookmarkData = {
  url: string
  title: string
  notes: string
  tags: string[]
}
