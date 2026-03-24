package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
)

type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	PrepareContext(ctx context.Context, query string) (*sql.Stmt, error)
}

func WithTx(ctx context.Context, db *sqlx.DB, fn func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit()
}

type BulkCaseEntry struct {
	ID    int64
	Value any
}

// BulkCaseUpdate builds and executes: UPDATE <table> SET <column> = CASE id WHEN ? THEN ? ... END WHERE id IN (...)
func BulkCaseUpdate(ctx context.Context, db DBTX, table, column string, entries []BulkCaseEntry) error {
	if len(entries) == 0 {
		return nil
	}
	caseClauses := make([]string, len(entries))
	ids := make([]any, len(entries))
	args := make([]any, 0, len(entries)*3)

	for i, e := range entries {
		caseClauses[i] = "WHEN ? THEN ?"
		args = append(args, e.ID, e.Value)
		ids[i] = e.ID
	}

	query := "UPDATE " + table + " SET " + column + " = CASE id " +
		strings.Join(caseClauses, " ") +
		" END WHERE id IN (?" + strings.Repeat(",?", len(entries)-1) + ")"

	args = append(args, ids...)

	if _, err := db.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("bulk case update %s.%s: %w", table, column, err)
	}
	return nil
}

func BulkDelete(ctx context.Context, db DBTX, table, column string, ids []int) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}
	query := "DELETE FROM " + table + " WHERE " + column + " IN (" + strings.Join(placeholders, ",") + ")"
	if _, err := db.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("bulk delete from %s: %w", table, err)
	}
	return nil
}
