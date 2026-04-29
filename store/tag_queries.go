package store

import (
	"context"

	"github.com/ogzhanolguncu/ronin/model"
)

func (s *Store) ListActiveTags(ctx context.Context) ([]model.Tag, error) {
	rows, err := s.ReadQ.ListActiveTags(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.Tag, len(rows))
	for i, r := range rows {
		out[i] = model.Tag{
			Name:  r.Name,
			Count: int(r.Count),
		}
	}
	return out, nil
}
