package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/ogzhanolguncu/ronin/model"
)

type BookmarkFilters struct {
	Where string
	Args  []any
}

func (s *Store) ListBookmarks(ctx context.Context, f BookmarkFilters, orderBy string, limit, offset int) ([]model.Bookmark, int, error) {
	query := `
		SELECT bm.id, bm.url, bm.title, bm.description, bm.notes,
		       bm.archived, bm.read, bm.favorite, bm.collection_id,
		       bm.created_at, bm.updated_at, bm.tags,
		       bm.snapshot_status, bm.readable_status,
		       COUNT(*) OVER() AS total_count
		FROM bookmark bm
		WHERE 1=1` + f.Where + orderBy + ` LIMIT ? OFFSET ?`
	args := append(f.Args, limit, offset)

	rows, err := s.readDB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list bookmarks: %w", err)
	}
	defer rows.Close()

	var bookmarks []model.Bookmark
	var totalCount int
	for rows.Next() {
		bm, err := scanBookmarkRow(rows, false)
		if err != nil {
			return nil, 0, err
		}
		totalCount = bm.TotalCount
		bookmarks = append(bookmarks, bm)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return bookmarks, totalCount, nil
}

func (s *Store) SearchBookmarks(ctx context.Context, match string, f BookmarkFilters, limit, offset int) ([]model.Bookmark, int, error) {
	query := `
		SELECT bm.id, bm.url, bm.title, bm.description, bm.notes,
		       bm.archived, bm.read, bm.favorite, bm.collection_id,
		       bm.created_at, bm.updated_at, bm.tags,
		       bm.snapshot_status, bm.readable_status,
		       (SELECT COUNT(*) FROM bookmark_fts JOIN bookmark bm ON bm.id = bookmark_fts.rowid WHERE bookmark_fts MATCH ?` + f.Where + `) AS total_count,
		       highlight(bookmark_fts, 0, '<mark>', '</mark>') AS title_snippet,
		       snippet(bookmark_fts, 1, '<mark>', '</mark>', '…', 32) AS description_snippet
		FROM bookmark_fts
		JOIN bookmark bm ON bm.id = bookmark_fts.rowid
		WHERE bookmark_fts MATCH ?` + f.Where + `
		ORDER BY bookmark_fts.rank
		LIMIT ? OFFSET ?`

	args := append([]any{match}, f.Args...)
	args = append(args, match)
	args = append(args, f.Args...)
	args = append(args, limit, offset)

	rows, err := s.readDB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("search bookmarks: %w", err)
	}
	defer rows.Close()

	var bookmarks []model.Bookmark
	var totalCount int
	for rows.Next() {
		bm, err := scanBookmarkRow(rows, true)
		if err != nil {
			return nil, 0, err
		}
		totalCount = bm.TotalCount
		bookmarks = append(bookmarks, bm)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return bookmarks, totalCount, nil
}

func scanBookmarkRow(rows *sql.Rows, withSnippets bool) (model.Bookmark, error) {
	var bm model.Bookmark
	var archived, read, favorite int64
	var collectionID sql.NullInt64
	var createdAt, updatedAt int64

	if withSnippets {
		err := rows.Scan(
			&bm.ID, &bm.URL, &bm.Title, &bm.Description, &bm.Notes,
			&archived, &read, &favorite, &collectionID,
			&createdAt, &updatedAt, &bm.Tags,
			&bm.SnapshotStatus, &bm.ReadableStatus,
			&bm.TotalCount,
			&bm.TitleSnippet, &bm.DescriptionSnippet,
		)
		if err != nil {
			return bm, err
		}
	} else {
		err := rows.Scan(
			&bm.ID, &bm.URL, &bm.Title, &bm.Description, &bm.Notes,
			&archived, &read, &favorite, &collectionID,
			&createdAt, &updatedAt, &bm.Tags,
			&bm.SnapshotStatus, &bm.ReadableStatus,
			&bm.TotalCount,
		)
		if err != nil {
			return bm, err
		}
	}

	bm.Archived = archived != 0
	bm.Read = read != 0
	bm.Favorite = favorite != 0
	bm.CollectionID = nullInt64Ptr(collectionID)
	bm.CreatedAt = uint64(createdAt)
	bm.UpdatedAt = uint64(updatedAt)

	return bm, nil
}

func (s *Store) BulkCaseUpdateBookmark(ctx context.Context, column string, entries []BulkCaseEntry) error {
	return BulkCaseUpdate(ctx, s.writeDB, "bookmark", column, entries)
}

func (s *Store) BulkDeleteBookmarks(ctx context.Context, column string, ids []int) error {
	return BulkDelete(ctx, s.writeDB, "bookmark", column, ids)
}

func BoolToInt64(b bool) int64 {
	if b {
		return 1
	}
	return 0
}

func NullInt64FromPtr(p *int64) sql.NullInt64 {
	if p != nil {
		return sql.NullInt64{Int64: *p, Valid: true}
	}
	return sql.NullInt64{}
}

func OrderByClause(sort string) string {
	switch sort {
	case "oldest":
		return " ORDER BY bm.created_at ASC, bm.id ASC"
	case "az":
		return " ORDER BY bm.title ASC, bm.id ASC"
	case "za":
		return " ORDER BY bm.title DESC, bm.id DESC"
	default:
		return " ORDER BY bm.created_at DESC, bm.id DESC"
	}
}

func PrepareSearchQuery(q string) string {
	terms := strings.Fields(q)
	for i, t := range terms {
		if !strings.HasSuffix(t, "*") {
			terms[i] = t + "*"
		}
	}
	return strings.Join(terms, " ")
}
