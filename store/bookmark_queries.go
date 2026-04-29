package store

import (
	"context"
	"database/sql"

	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

func (s *Store) GetBookmark(ctx context.Context, id int64) (model.Bookmark, error) {
	r, err := s.ReadQ.GetBookmark(ctx, id)
	if err != nil {
		return model.Bookmark{}, err
	}
	return bookmarkFromGetRow(r), nil
}

func (s *Store) GetBookmarkByURL(ctx context.Context, url string) (model.Bookmark, error) {
	r, err := s.ReadQ.GetBookmarkByURL(ctx, url)
	if err != nil {
		return model.Bookmark{}, err
	}
	return model.Bookmark{
		ID:             r.ID,
		URL:            r.Url,
		Title:          r.Title,
		Description:    r.Description,
		Notes:          r.Notes,
		Archived:       r.Archived != 0,
		Read:           r.Read != 0,
		Favorite:       r.Favorite != 0,
		CollectionID:   nullInt64Ptr(r.CollectionID),
		Tags:           r.Tags,
		SnapshotStatus: r.SnapshotStatus,
		ReadableStatus: r.ReadableStatus,
		CreatedAt:      uint64(r.CreatedAt),
		UpdatedAt:      uint64(r.UpdatedAt),
	}, nil
}

func (s *Store) GetBookmarkURL(ctx context.Context, id int64) (string, error) {
	return s.ReadQ.GetBookmarkURL(ctx, id)
}

func (s *Store) GetBookmarkCounts(ctx context.Context) (model.BookmarkCounts, error) {
	r, err := s.ReadQ.GetBookmarkCounts(ctx)
	if err != nil {
		return model.BookmarkCounts{}, err
	}
	return model.BookmarkCounts{
		All:       toInt(r.AllCount),
		Favorites: toInt(r.FavoritesCount),
		Unread:    toInt(r.UnreadCount),
		Archived:  toInt(r.ArchivedCount),
	}, nil
}

func (s *Store) CreateBookmark(ctx context.Context, p dbgen.CreateBookmarkParams) (int64, error) {
	return s.WriteQ.CreateBookmark(ctx, p)
}

func (s *Store) UpdateBookmark(ctx context.Context, p dbgen.UpdateBookmarkParams) (sql.Result, error) {
	return s.WriteQ.UpdateBookmark(ctx, p)
}

func (s *Store) DeleteBookmark(ctx context.Context, id int64) (sql.Result, error) {
	return s.WriteQ.DeleteBookmark(ctx, id)
}

func (s *Store) DeleteBookmarkTags(ctx context.Context, bookmarkID int64) error {
	return s.WriteQ.DeleteBookmarkTags(ctx, bookmarkID)
}

func bookmarkFromGetRow(r dbgen.GetBookmarkRow) model.Bookmark {
	return model.Bookmark{
		ID:             r.ID,
		URL:            r.Url,
		Title:          r.Title,
		Description:    r.Description,
		Notes:          r.Notes,
		Archived:       r.Archived != 0,
		Read:           r.Read != 0,
		Favorite:       r.Favorite != 0,
		CollectionID:   nullInt64Ptr(r.CollectionID),
		Tags:           r.Tags,
		SnapshotStatus: r.SnapshotStatus,
		ReadableStatus: r.ReadableStatus,
		CreatedAt:      uint64(r.CreatedAt),
		UpdatedAt:      uint64(r.UpdatedAt),
	}
}

func nullInt64Ptr(n sql.NullInt64) *int64 {
	if n.Valid {
		return &n.Int64
	}
	return nil
}

func toInt(v any) int {
	switch n := v.(type) {
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}
