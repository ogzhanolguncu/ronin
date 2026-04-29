package model

import (
	"errors"
	"strings"
)

var ErrNotFound = errors.New("not found")

type Bookmark struct {
	ID                 int64    `db:"id"          json:"id"`
	URL                string   `db:"url"         json:"url"`
	Title              string   `db:"title"       json:"title"`
	Notes              string   `db:"notes"       json:"notes"`
	Description        string   `db:"description" json:"description"`
	Archived           bool     `db:"archived"    json:"archived"`
	Read               bool     `db:"read"        json:"read"`
	Favorite           bool     `db:"favorite"      json:"favorite"`
	CollectionID       *int64   `db:"collection_id" json:"collection_id"`
	Tags               string   `db:"tags"            json:"-"`
	ParsedTags         []string `db:"-"               json:"tags"`
	SnapshotStatus     string   `db:"snapshot_status" json:"snapshot_status"`
	ReadableStatus     string   `db:"readable_status" json:"readable_status"`
	WaybackURL         string   `db:"-"               json:"wayback_url"`
	CreatedAt          uint64   `db:"created_at"      json:"created_at"`
	UpdatedAt          uint64   `db:"updated_at"      json:"updated_at"`
	TitleSnippet       string   `db:"title_snippet"       json:"title_snippet,omitempty"`
	DescriptionSnippet string   `db:"description_snippet" json:"description_snippet,omitempty"`
	TotalCount         int      `db:"total_count"         json:"-"`
}

func (b *Bookmark) ParseTags() {
	if b.Tags == "" {
		b.ParsedTags = []string{}
	} else {
		b.ParsedTags = strings.Fields(b.Tags)
	}
	b.WaybackURL = "https://web.archive.org/web/" + b.URL
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

type BookmarkCounts struct {
	All       int `db:"all_count"       json:"all"`
	Favorites int `db:"favorites_count" json:"favorites"`
	Unread    int `db:"unread_count"    json:"unread"`
	Archived  int `db:"archived_count"  json:"archived"`
}

type BookmarkCountsResponse struct {
	Counts BookmarkCounts `json:"counts"`
}
