-- name: GetBookmark :one
SELECT id, url, title, description, notes,
       archived, read, favorite, collection_id,
       created_at, updated_at, tags,
       snapshot_status, readable_status
FROM bookmark WHERE id = ?;

-- name: GetBookmarkByURL :one
SELECT id, url, title, description, notes,
       archived, read, favorite, collection_id,
       created_at, updated_at, tags,
       snapshot_status, readable_status
FROM bookmark WHERE url = ?;

-- name: GetBookmarkURL :one
SELECT url FROM bookmark WHERE id = ?;

-- name: GetBookmarkCounts :one
SELECT
    COALESCE(SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END), 0) AS all_count,
    COALESCE(SUM(CASE WHEN favorite = 1 THEN 1 ELSE 0 END), 0) AS favorites_count,
    COALESCE(SUM(CASE WHEN read = 0    THEN 1 ELSE 0 END), 0)  AS unread_count,
    COALESCE(SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END), 0) AS archived_count
FROM bookmark;

-- name: CreateBookmark :execlastid
INSERT INTO bookmark (url, title, description, notes, favorite, collection_id)
VALUES (?, ?, ?, ?, ?, ?);

-- name: CreateBookmarkFull :execlastid
INSERT INTO bookmark (url, title, description, notes, archived, read, favorite, collection_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateBookmark :execresult
UPDATE bookmark SET url = ?, title = ?, description = ?, notes = ?, favorite = ?, collection_id = ?
WHERE id = ?;

-- name: DeleteBookmark :execresult
DELETE FROM bookmark WHERE id = ?;

-- name: DeleteBookmarkTags :exec
DELETE FROM bookmark_tag WHERE bookmark_id = ?;
