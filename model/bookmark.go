package model

import (
	"errors"
	"strings"
)

var ErrNotFound = errors.New("not found")

const BookmarkBaseQuery = `
	SELECT bm.id, bm.url, bm.title, bm.description, bm.notes,
	       bm.archived, bm.read, bm.created_at, bm.updated_at,
	       COALESCE(GROUP_CONCAT(t.name, ', '), '') AS tags
	FROM bookmark bm
	LEFT JOIN bookmark_tag bt ON bt.bookmark_id = bm.id
	LEFT JOIN tag t ON t.id = bt.tag_id`

type Bookmark struct {
	ID          int64    `db:"id"          json:"id"`
	URL         string   `db:"url"         json:"url"`
	Title       string   `db:"title"       json:"title"`
	Notes       string   `db:"notes"       json:"notes"`
	Description string   `db:"description" json:"description"`
	Archived    bool     `db:"archived"    json:"archived"`
	Read        bool     `db:"read"        json:"read"`
	Tags        string   `db:"tags"        json:"-"`
	ParsedTags  []string `db:"-"           json:"tags"`
	CreatedAt   uint64   `db:"created_at"  json:"created_at"`
	UpdatedAt   uint64   `db:"updated_at"  json:"updated_at"`
}

func (b *Bookmark) ParseTags() {
	if b.Tags == "" {
		b.ParsedTags = []string{}
	} else {
		b.ParsedTags = strings.Split(b.Tags, ", ")
	}
}

type ResponseMeta struct {
	Cursor *int64 `json:"cursor"`
}

type ListBookmarksResponse struct {
	Bookmarks []Bookmark   `json:"bookmarks"`
	Meta      ResponseMeta `json:"meta"`
}

type CreateBookmarkRequest struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	Tags        string `json:"tags"`
}

type UpdateBookmarkRequest struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	Tags        string `json:"tags"`
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
