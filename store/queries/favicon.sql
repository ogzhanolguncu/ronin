-- name: GetFavicon :one
SELECT data, content_type FROM favicon WHERE domain = ?;

-- name: GetFaviconFetchedAt :one
SELECT fetched_at FROM favicon WHERE domain = ?;

-- name: UpsertFavicon :exec
INSERT INTO favicon (domain, data, content_type, fetched_at) VALUES (?, ?, ?, unixepoch())
ON CONFLICT(domain) DO UPDATE SET data = excluded.data, content_type = excluded.content_type, fetched_at = excluded.fetched_at;

-- name: UpsertFaviconIgnore :exec
INSERT OR IGNORE INTO favicon (domain, data, content_type, fetched_at) VALUES (?, ?, ?, unixepoch());
