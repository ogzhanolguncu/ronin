import type {
  Bookmark,
  ListBookmarksResponse,
  CreateBookmarkRequest,
  CreateBookmarkResponse,
  UpdateBookmarkRequest,
  ArchiveEntry,
  ReadEntry,
} from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export function getBookmarks(cursor?: number): Promise<ListBookmarksResponse> {
  const params = cursor != null ? `?cursor=${cursor}` : ''
  return request(`/api/v1/bookmarks${params}`)
}

export function searchBookmarks(query: string): Promise<ListBookmarksResponse> {
  return request(`/api/v1/bookmarks/search?q=${encodeURIComponent(query)}`)
}

export function getBookmark(id: number): Promise<Bookmark> {
  return request(`/api/v1/bookmarks/${id}`)
}

export function createBookmark(req: CreateBookmarkRequest): Promise<CreateBookmarkResponse> {
  return request('/api/v1/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export function updateBookmark(req: UpdateBookmarkRequest): Promise<void> {
  return request('/api/v1/bookmarks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export function deleteBookmark(id: number): Promise<void> {
  return request(`/api/v1/bookmarks/${id}`, { method: 'DELETE' })
}

export function deleteBookmarks(ids: number[]): Promise<void> {
  return request('/api/v1/bookmarks', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

export function archiveBookmarks(entries: ArchiveEntry[]): Promise<void> {
  return request('/api/v1/bookmarks/archive', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids_archived: entries }),
  })
}

export function readBookmarks(entries: ReadEntry[]): Promise<void> {
  return request('/api/v1/bookmarks/read', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids_read: entries }),
  })
}
