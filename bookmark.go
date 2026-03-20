package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

var ErrNotFound = errors.New("not found")

const bookmarkBaseQuery = `
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

func (b *Bookmark) parseTags() {
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

func insertFTS(ctx context.Context, db DBTX, id int64, title, description, notes, url, tags string) error {
	_, err := db.ExecContext(ctx,
		"INSERT INTO bookmark_fts(rowid, title, description, notes, url, tags) VALUES (?, ?, ?, ?, ?, ?)",
		id, title, description, notes, url, tags,
	)
	if err != nil {
		return fmt.Errorf("insert FTS for bookmark %d: %w", id, err)
	}
	return nil
}

func deleteFTS(ctx context.Context, db DBTX, id int64) error {
	_, err := db.ExecContext(ctx, "DELETE FROM bookmark_fts WHERE rowid = ?", id)
	if err != nil {
		return fmt.Errorf("delete FTS for bookmark %d: %w", id, err)
	}
	return nil
}

// upsertTagsAndLink upserts tags by name, then inserts bookmark_tag rows for the given bookmark ID.
// Caller is responsible for deleting old bookmark_tag rows if needed.
func upsertTagsAndLink(ctx context.Context, db DBTX, bookmarkID int64, tags string) error {
	var tagIDs []int64
	if tags != "" {
		for tag := range strings.FieldsSeq(tags) {
			var id int64
			err := db.QueryRowContext(ctx,
				"INSERT INTO tag (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name=name RETURNING id",
				tag,
			).Scan(&id)
			if err != nil {
				return fmt.Errorf("failed to upsert tag %q: %w", tag, err)
			}
			tagIDs = append(tagIDs, id)
		}
	}

	if len(tagIDs) > 0 {
		placeholders := make([]string, len(tagIDs))
		args := make([]any, len(tagIDs)*2)
		for i, tagID := range tagIDs {
			placeholders[i] = "(?, ?)"
			args[i*2] = bookmarkID
			args[i*2+1] = tagID
		}
		if _, err := db.ExecContext(ctx,
			"INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES "+strings.Join(placeholders, ", "),
			args...,
		); err != nil {
			return fmt.Errorf("failed to insert bookmark tags: %w", err)
		}
	}
	return nil
}
