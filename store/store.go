package store

import (
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/ogzhanolguncu/ronin/store/dbgen"
	"modernc.org/sqlite"
	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schemaSQL string

//go:embed schema_fts.sql
var schemaFTSSQL string

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
	for _, stmt := range splitStatements(schemaSQL) {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate: %w\nstatement: %s", err, stmt)
		}
	}
	for _, stmt := range splitStatements(schemaFTSSQL) {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate fts: %w\nstatement: %s", err, stmt)
		}
	}
	return nil
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
