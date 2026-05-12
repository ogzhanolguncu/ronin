package store

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/ogzhanolguncu/ronin/store/dbgen"
	"modernc.org/sqlite"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

type Store struct {
	readDB  *sql.DB
	writeDB *sql.DB
	ReadQ   *dbgen.Queries
	WriteQ  *dbgen.Queries
}

func NewStore(path string) (*Store, error) {
	writeDB, err := openDB(path, 1)
	if err != nil {
		return nil, fmt.Errorf("open write db: %w", err)
	}

	if err := migrate(writeDB); err != nil {
		writeDB.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	if path == ":memory:" {
		return &Store{
			readDB:  writeDB,
			writeDB: writeDB,
			ReadQ:   dbgen.New(writeDB),
			WriteQ:  dbgen.New(writeDB),
		}, nil
	}

	readDB, err := openDB(path, 4)
	if err != nil {
		writeDB.Close()
		return nil, fmt.Errorf("open read db: %w", err)
	}

	return &Store{
		readDB:  readDB,
		writeDB: writeDB,
		ReadQ:   dbgen.New(readDB),
		WriteQ:  dbgen.New(writeDB),
	}, nil
}

func (s *Store) Close() error {
	var readErr error
	if s.readDB != s.writeDB {
		readErr = s.readDB.Close()
	}
	return errors.Join(readErr, s.writeDB.Close())
}

func openDB(path string, maxConns int) (*sql.DB, error) {
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

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	db.SetMaxOpenConns(maxConns)
	db.SetMaxIdleConns(maxConns)
	db.SetConnMaxLifetime(0)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return db, nil
}

func migrate(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_version (
		version    INTEGER PRIMARY KEY,
		applied_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`); err != nil {
		return fmt.Errorf("create schema_version: %w", err)
	}

	var currentVersion int
	if err := db.QueryRow(`SELECT COALESCE(MAX(version), 0) FROM schema_version`).Scan(&currentVersion); err != nil {
		return fmt.Errorf("read current version: %w", err)
	}

	pending, err := collectPendingMigrations(currentVersion)
	if err != nil {
		return err
	}

	for _, m := range pending {
		content, err := migrationsFS.ReadFile(m.path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", m.path, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin migration %d: %w", m.version, err)
		}

		for _, stmt := range splitStatements(string(content)) {
			if _, err := tx.Exec(stmt); err != nil {
				_ = tx.Rollback()
				return fmt.Errorf("migration %d: %w\nstatement: %s", m.version, err, stmt)
			}
		}

		if _, err := tx.Exec(`INSERT INTO schema_version (version) VALUES (?)`, m.version); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %d: %w", m.version, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %d: %w", m.version, err)
		}
	}

	return nil
}

type migration struct {
	version int
	path    string
}

func collectPendingMigrations(currentVersion int) ([]migration, error) {
	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	var pending []migration
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}
		// Expected format: NNNN_description.sql (e.g. 0001_init.sql).
		parts := strings.SplitN(name, "_", 2)
		if len(parts) < 2 {
			return nil, fmt.Errorf("invalid migration filename: %s", name)
		}
		v, err := strconv.Atoi(parts[0])
		if err != nil {
			return nil, fmt.Errorf("invalid migration version in %s: %w", name, err)
		}
		if v > currentVersion {
			pending = append(pending, migration{version: v, path: "migrations/" + name})
		}
	}

	sort.Slice(pending, func(i, j int) bool { return pending[i].version < pending[j].version })
	return pending, nil
}

// splitStatements splits SQL text into individual statements,
// respecting BEGIN...END blocks used in triggers.
func splitStatements(sql string) []string {
	var stmts []string
	var current strings.Builder
	inBlock := false

	for _, line := range strings.Split(sql, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		upper := strings.ToUpper(trimmed)
		if upper == "BEGIN" {
			inBlock = true
		}

		current.WriteString(line)
		current.WriteString("\n")

		if strings.HasSuffix(trimmed, ";") && !inBlock {
			if s := strings.TrimSpace(current.String()); s != "" {
				stmts = append(stmts, s)
			}
			current.Reset()
		} else if inBlock && (upper == "END;" || strings.HasSuffix(upper, "\nEND;")) {
			inBlock = false
			if s := strings.TrimSpace(current.String()); s != "" {
				stmts = append(stmts, s)
			}
			current.Reset()
		}
	}

	if s := strings.TrimSpace(current.String()); s != "" {
		stmts = append(stmts, s)
	}

	return stmts
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
