package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/jmoiron/sqlx"
	"modernc.org/sqlite"
)

type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

const (
	sqliteConstraintUnique     = 2067 // SQLITE_CONSTRAINT_UNIQUE — duplicate unique field
	sqliteConstraintNotNull    = 1299 // SQLITE_CONSTRAINT_NOTNULL — null on not null column
	sqliteConstraintForeignKey = 787  // SQLITE_CONSTRAINT_FOREIGNKEY — references non-existent row
)

type Store struct {
	db *sqlx.DB
}

func openDB(path string) (*sqlx.DB, error) {
	params := url.Values{
		"_foreign_keys": {"on"},
		"_journal_mode": {"WAL"},
		"_synchronous":  {"NORMAL"},
		"_busy_timeout": {"5000"},
		"_cache_size":   {"-20000"},
		"_temp_store":   {"memory"},
		"_mmap_size":    {"268435456"},
	}
	dsn := path + "?" + params.Encode()

	db, err := sqlx.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	// Single connection: avoids SQLITE_BUSY on concurrent writes.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return db, nil
}

func migrate(db *sqlx.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS bookmark (
			id          INTEGER  PRIMARY KEY AUTOINCREMENT,
			url         TEXT NOT NULL UNIQUE CHECK(length(url) >= 1   AND length(url) <= 2048),
			title       TEXT NOT NULL        CHECK(length(title) >= 1 AND length(title) <= 512),
			description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 1024),
			notes       TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 8192),
			archived    INTEGER  NOT NULL DEFAULT 0,
			read        INTEGER  NOT NULL DEFAULT 0,
			created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
			updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS tag (
			id         INTEGER  PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE CHECK(length(name) >= 1 AND length(name) <= 64),
			created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
			updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS bookmark_tag (
			bookmark_id INTEGER NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE,
			tag_id      INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
			PRIMARY KEY (bookmark_id, tag_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_bookmark_archived ON bookmark(archived)`,
		`CREATE INDEX IF NOT EXISTS idx_bookmark_read ON bookmark(read)`,
		`CREATE INDEX IF NOT EXISTS idx_bookmark_archived_read_id ON bookmark(archived, read, id)`,
		`CREATE INDEX IF NOT EXISTS idx_bookmark_tag_tag_id ON bookmark_tag(tag_id)`,
		`CREATE TRIGGER IF NOT EXISTS bookmark_updated_at
		AFTER UPDATE ON bookmark
		BEGIN
			UPDATE bookmark SET updated_at = unixepoch() WHERE id = NEW.id;
		END`,
		`CREATE TRIGGER IF NOT EXISTS tag_updated_at
		AFTER UPDATE ON tag
		BEGIN
			UPDATE tag SET updated_at = unixepoch() WHERE id = NEW.id;
		END`,

		// Standalone FTS5 table with tags column, managed in Go code
		`CREATE VIRTUAL TABLE IF NOT EXISTS bookmark_fts USING fts5(
			title, description, notes, url, tags
		)`,

		`CREATE TABLE IF NOT EXISTS session (
			token      TEXT    PRIMARY KEY,
			expires_at INTEGER NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session(expires_at)`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate: %w\nstatement: %s", err, stmt)
		}
	}
	return nil
}

func NewStore(path string) (*Store, error) {
	db, err := openDB(path)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	if err := migrate(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func IsUniqueConstraintErr(err error) bool {
	var sqliteErr *sqlite.Error
	return errors.As(err, &sqliteErr) && sqliteErr.Code() == sqliteConstraintUnique
}

func IsNotNullConstraintErr(err error) bool {
	var sqliteErr *sqlite.Error
	return errors.As(err, &sqliteErr) && sqliteErr.Code() == sqliteConstraintNotNull
}

func IsForeignKeyConstraintErr(err error) bool {
	var sqliteErr *sqlite.Error
	return errors.As(err, &sqliteErr) && sqliteErr.Code() == sqliteConstraintForeignKey
}

func WithTx(ctx context.Context, db *sql.DB, fn func(*sql.Tx) error) error {
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
