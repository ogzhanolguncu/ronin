package store

import (
	"context"

	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

func (s *Store) GetFavicon(ctx context.Context, domain string) ([]byte, string, error) {
	r, err := s.ReadQ.GetFavicon(ctx, domain)
	if err != nil {
		return nil, "", err
	}
	return r.Data, r.ContentType, nil
}

func (s *Store) GetFaviconFetchedAt(ctx context.Context, domain string) (int64, error) {
	return s.ReadQ.GetFaviconFetchedAt(ctx, domain)
}

func (s *Store) UpsertFavicon(ctx context.Context, domain string, data []byte, contentType string) error {
	return s.WriteQ.UpsertFavicon(ctx, dbgen.UpsertFaviconParams{
		Domain:      domain,
		Data:        data,
		ContentType: contentType,
	})
}

func (s *Store) UpsertFaviconIgnore(ctx context.Context, domain string, data []byte, contentType string) error {
	return s.WriteQ.UpsertFaviconIgnore(ctx, dbgen.UpsertFaviconIgnoreParams{
		Domain:      domain,
		Data:        data,
		ContentType: contentType,
	})
}
