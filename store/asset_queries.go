package store

import (
	"context"

	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

type AssetStatus struct {
	SnapshotStatus string
	ReadableStatus string
}

func (s *Store) GetAssetStatus(ctx context.Context, id int64) (AssetStatus, error) {
	r, err := s.ReadQ.GetAssetStatus(ctx, id)
	if err != nil {
		return AssetStatus{}, err
	}
	return AssetStatus{
		SnapshotStatus: r.SnapshotStatus,
		ReadableStatus: r.ReadableStatus,
	}, nil
}

func (s *Store) UpdateSnapshotStatus(ctx context.Context, id int64, status string) error {
	return s.WriteQ.UpdateSnapshotStatus(ctx, dbgen.UpdateSnapshotStatusParams{
		SnapshotStatus: status,
		ID:             id,
	})
}

func (s *Store) UpdateReadableStatus(ctx context.Context, id int64, status string) error {
	return s.WriteQ.UpdateReadableStatus(ctx, dbgen.UpdateReadableStatusParams{
		ReadableStatus: status,
		ID:             id,
	})
}
