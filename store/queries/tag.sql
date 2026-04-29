-- name: ListActiveTags :many
SELECT name, count FROM tag WHERE count > 0 ORDER BY name;
