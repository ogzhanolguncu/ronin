-- name: GetCollection :one
SELECT id, name, slug, color_id, created_at, updated_at
FROM collection WHERE id = ?;

-- name: ListCollections :many
SELECT id, name, slug, color_id, created_at, updated_at
FROM collection ORDER BY name ASC;

-- name: CreateCollection :one
INSERT INTO collection (name, slug, color_id) VALUES (?, ?, ?)
RETURNING id, name, slug, color_id, created_at, updated_at;

-- name: UpdateCollection :execresult
UPDATE collection SET name = ?, slug = ?, color_id = ? WHERE id = ?;

-- name: DeleteCollection :execresult
DELETE FROM collection WHERE id = ?;
