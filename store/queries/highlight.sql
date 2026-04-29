-- name: GetHighlightsByBookmark :many
SELECT id, bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset, created_at, updated_at
FROM highlight WHERE bookmark_id = ? ORDER BY created_at ASC;

-- name: GetHighlight :one
SELECT id, bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset, created_at, updated_at
FROM highlight WHERE id = ?;

-- name: CreateHighlight :one
INSERT INTO highlight (bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset, created_at, updated_at;

-- name: UpdateHighlight :execresult
UPDATE highlight SET note = ?, color = ? WHERE id = ?;

-- name: DeleteHighlight :execresult
DELETE FROM highlight WHERE id = ?;
