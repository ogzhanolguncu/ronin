package store

import (
	"context"

	"github.com/ogzhanolguncu/ronin/store/dbgen"
)

func (s *Store) CreateSession(ctx context.Context, token string, expiresAt int64) error {
	return s.WriteQ.CreateSession(ctx, dbgen.CreateSessionParams{
		Token:     token,
		ExpiresAt: expiresAt,
	})
}

func (s *Store) DeleteSession(ctx context.Context, token string) error {
	return s.WriteQ.DeleteSession(ctx, token)
}

func (s *Store) DeleteExpiredSessions(ctx context.Context, now int64) error {
	return s.WriteQ.DeleteExpiredSessions(ctx, now)
}

func (s *Store) CountValidSessions(ctx context.Context, token string, now int64) (int64, error) {
	return s.ReadQ.CountValidSessions(ctx, dbgen.CountValidSessionsParams{
		Token:     token,
		ExpiresAt: now,
	})
}
