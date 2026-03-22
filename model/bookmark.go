package model

import (
	"errors"
	"strings"
)

var ErrNotFound = errors.New("not found")

const BookmarkBaseQuery = `
	SELECT bm.id, bm.url, bm.title, bm.description, bm.notes,
	       bm.archived, bm.read, bm.favorite, bm.collection_id,
	       bm.created_at, bm.updated_at, bm.tags
	FROM bookmark bm`

type Bookmark struct {
	ID          int64    `db:"id"          json:"id"`
	URL         string   `db:"url"         json:"url"`
	Title       string   `db:"title"       json:"title"`
	Notes       string   `db:"notes"       json:"notes"`
	Description string   `db:"description" json:"description"`
	Archived    bool     `db:"archived"    json:"archived"`
	Read        bool     `db:"read"        json:"read"`
	Favorite     bool     `db:"favorite"      json:"favorite"`
	CollectionID *int64  `db:"collection_id" json:"collection_id"`
	Tags         string  `db:"tags"          json:"-"`
	ParsedTags  []string `db:"-"           json:"tags"`
	CreatedAt   uint64   `db:"created_at"  json:"created_at"`
	UpdatedAt   uint64   `db:"updated_at"  json:"updated_at"`
	TotalCount  int      `db:"total_count" json:"-"`
}

func (b *Bookmark) ParseTags() {
	if b.Tags == "" {
		b.ParsedTags = []string{}
	} else {
		b.ParsedTags = strings.Fields(b.Tags)
	}
}

type PaginationMeta struct {
	Page       int  `json:"page"`
	TotalPages int  `json:"total_pages"`
	TotalCount int  `json:"total_count"`
	HasMore    bool `json:"has_more"`
}

type ListBookmarksResponse struct {
	Bookmarks []Bookmark     `json:"bookmarks"`
	Meta      PaginationMeta `json:"meta"`
}

type SearchBookmark struct {
	Bookmark
	TitleSnippet       string `db:"title_snippet"       json:"title_snippet"`
	DescriptionSnippet string `db:"description_snippet" json:"description_snippet"`
}

func (b *SearchBookmark) ParseTags() {
	if b.Tags == "" {
		b.ParsedTags = []string{}
	} else {
		b.ParsedTags = strings.Fields(b.Tags)
	}
}

type SearchBookmarksResponse struct {
	Bookmarks []SearchBookmark `json:"bookmarks"`
	Meta      PaginationMeta   `json:"meta"`
}

type CreateBookmarkRequest struct {
	URL          string `json:"url"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Notes        string `json:"notes"`
	Tags         string `json:"tags"`
	Favorite     bool   `json:"favorite"`
	CollectionID *int64 `json:"collection_id"`
}

type UpdateBookmarkRequest struct {
	URL          string `json:"url"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Notes        string `json:"notes"`
	Tags         string `json:"tags"`
	Favorite     bool   `json:"favorite"`
	CollectionID *int64 `json:"collection_id"`
}

type DeleteBookmarkRequest struct {
	IDs []int `json:"ids"`
}

type ArchiveEntry struct {
	ID       int64 `json:"id"`
	Archived bool  `json:"archived"`
}

type ArchiveBookmarkRequest struct {
	IDs []ArchiveEntry `json:"ids_archived"`
}

type ReadEntry struct {
	ID   int64 `json:"id"`
	Read bool  `json:"read"`
}

type ReadBookmarkRequest struct {
	IDs []ReadEntry `json:"ids_read"`
}

type FavoriteEntry struct {
	ID       int64 `json:"id"`
	Favorite bool  `json:"favorite"`
}

type FavoriteBookmarkRequest struct {
	IDs []FavoriteEntry `json:"ids_favorite"`
}
