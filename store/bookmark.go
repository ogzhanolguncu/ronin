package store

import (
	"context"
	"fmt"
	"strings"
)

func InsertFTS(ctx context.Context, db DBTX, id int64, title, description, notes, url, tags string) error {
	_, err := db.ExecContext(ctx,
		"INSERT INTO bookmark_fts(rowid, title, description, notes, url, tags) VALUES (?, ?, ?, ?, ?, ?)",
		id, title, description, notes, url, tags,
	)
	if err != nil {
		return fmt.Errorf("insert FTS for bookmark %d: %w", id, err)
	}
	return nil
}

func DeleteFTS(ctx context.Context, db DBTX, id int64) error {
	_, err := db.ExecContext(ctx, "DELETE FROM bookmark_fts WHERE rowid = ?", id)
	if err != nil {
		return fmt.Errorf("delete FTS for bookmark %d: %w", id, err)
	}
	return nil
}

// UpsertTagsAndLink upserts tags by name, then inserts bookmark_tag rows for the given bookmark ID.
// Caller is responsible for deleting old bookmark_tag rows if needed.
func UpsertTagsAndLink(ctx context.Context, db DBTX, bookmarkID int64, tags string) error {
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
