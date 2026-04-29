package store

import (
	"context"
	"database/sql"

	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

func (s *Store) ListCollections(ctx context.Context) ([]model.Collection, error) {
	rows, err := s.ReadQ.ListCollections(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.Collection, len(rows))
	for i, r := range rows {
		out[i] = collectionFromDB(r)
	}
	return out, nil
}

func (s *Store) GetCollection(ctx context.Context, id int64) (model.Collection, error) {
	r, err := s.ReadQ.GetCollection(ctx, id)
	if err != nil {
		return model.Collection{}, err
	}
	return collectionFromDB(r), nil
}

func (s *Store) CreateCollection(ctx context.Context, name, slug string, colorID int) (model.Collection, error) {
	r, err := s.WriteQ.CreateCollection(ctx, dbgen.CreateCollectionParams{
		Name:    name,
		Slug:    slug,
		ColorID: int64(colorID),
	})
	if err != nil {
		return model.Collection{}, err
	}
	return collectionFromDB(r), nil
}

func (s *Store) UpdateCollection(ctx context.Context, id int64, name, slug string, colorID int) (sql.Result, error) {
	return s.WriteQ.UpdateCollection(ctx, dbgen.UpdateCollectionParams{
		Name:    name,
		Slug:    slug,
		ColorID: int64(colorID),
		ID:      id,
	})
}

func (s *Store) DeleteCollection(ctx context.Context, id int64) (sql.Result, error) {
	return s.WriteQ.DeleteCollection(ctx, id)
}

func collectionFromDB(r dbgen.Collection) model.Collection {
	return model.Collection{
		ID:        r.ID,
		Name:      r.Name,
		Slug:      r.Slug,
		ColorID:   int(r.ColorID),
		CreatedAt: uint64(r.CreatedAt),
		UpdatedAt: uint64(r.UpdatedAt),
	}
}
