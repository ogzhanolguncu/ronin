package store

import (
	"context"
	"database/sql"

	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

func (s *Store) GetHighlightsByBookmark(ctx context.Context, bookmarkID int64) ([]model.Highlight, error) {
	rows, err := s.ReadQ.GetHighlightsByBookmark(ctx, bookmarkID)
	if err != nil {
		return nil, err
	}
	out := make([]model.Highlight, len(rows))
	for i, r := range rows {
		out[i] = highlightFromDB(r)
	}
	return out, nil
}

func (s *Store) GetHighlight(ctx context.Context, id int64) (model.Highlight, error) {
	r, err := s.ReadQ.GetHighlight(ctx, id)
	if err != nil {
		return model.Highlight{}, err
	}
	return highlightFromDB(r), nil
}

func (s *Store) CreateHighlight(ctx context.Context, p dbgen.CreateHighlightParams) (model.Highlight, error) {
	r, err := s.WriteQ.CreateHighlight(ctx, p)
	if err != nil {
		return model.Highlight{}, err
	}
	return highlightFromDB(r), nil
}

func (s *Store) UpdateHighlight(ctx context.Context, id int64, note, color string) (sql.Result, error) {
	return s.WriteQ.UpdateHighlight(ctx, dbgen.UpdateHighlightParams{
		Note:  note,
		Color: color,
		ID:    id,
	})
}

func (s *Store) DeleteHighlight(ctx context.Context, id int64) (sql.Result, error) {
	return s.WriteQ.DeleteHighlight(ctx, id)
}

func highlightFromDB(r dbgen.Highlight) model.Highlight {
	return model.Highlight{
		ID:          r.ID,
		BookmarkID:  r.BookmarkID,
		Text:        r.Text,
		Note:        r.Note,
		Color:       r.Color,
		StartPath:   r.StartPath,
		StartOffset: int(r.StartOffset),
		EndPath:     r.EndPath,
		EndOffset:   int(r.EndOffset),
		CreatedAt:   uint64(r.CreatedAt),
		UpdatedAt:   uint64(r.UpdatedAt),
	}
}
