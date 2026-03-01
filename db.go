package main

import (
	"errors"
	"fmt"
	"net/url"

	"github.com/jmoiron/sqlx"
	"modernc.org/sqlite"
)

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
