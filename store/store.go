package store

import (
	"errors"
	"fmt"
	"net/url"

	"github.com/jmoiron/sqlx"
	"modernc.org/sqlite"
)

type Store struct {
	DB *sqlx.DB
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

	return &Store{DB: db}, nil
}

func (s *Store) Close() error {
	return s.DB.Close()
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
			name       TEXT    NOT NULL UNIQUE CHECK(length(name) >= 1 AND length(name) <= 64),
			count      INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			updated_at INTEGER NOT NULL DEFAULT (unixepoch())
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

		`CREATE TRIGGER IF NOT EXISTS inc_tag_count AFTER INSERT ON bookmark_tag
		BEGIN
			UPDATE tag SET count = count + 1 WHERE id = NEW.tag_id;
		END`,

		`CREATE TRIGGER IF NOT EXISTS dec_tag_count AFTER DELETE ON bookmark_tag
		BEGIN
			UPDATE tag SET count = count - 1 WHERE id = OLD.tag_id;
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

		`CREATE TABLE IF NOT EXISTS favicon (
			domain       TEXT PRIMARY KEY,
			data         BLOB NOT NULL,
			content_type TEXT NOT NULL DEFAULT 'image/x-icon',
			fetched_at   INTEGER NOT NULL DEFAULT (unixepoch())
		)`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate: %w\nstatement: %s", err, stmt)
		}
	}
	return nil
}

const (
	sqliteConstraintUnique     = 2067
	sqliteConstraintNotNull    = 1299
	sqliteConstraintForeignKey = 787
)

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
