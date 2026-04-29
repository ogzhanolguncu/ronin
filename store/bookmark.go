package store

import (
	"context"
	"fmt"
	"strings"

	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

func UpsertTagsAndLink(ctx context.Context, db dbgen.DBTX, bookmarkID int64, tags string) error {
	var tagIDs []int64
	if tags != "" {
		stmt, err := db.PrepareContext(ctx,
			"INSERT INTO tag (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name=name RETURNING id")
		if err != nil {
			return fmt.Errorf("failed to prepare tag upsert: %w", err)
		}
		defer stmt.Close()

		for tag := range strings.FieldsSeq(tags) {
			var id int64
			if err := stmt.QueryRowContext(ctx, tag).Scan(&id); err != nil {
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
