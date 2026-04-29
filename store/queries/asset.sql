-- name: GetAssetStatus :one
SELECT snapshot_status, readable_status FROM bookmark WHERE id = ?;

-- name: UpdateSnapshotStatus :exec
UPDATE bookmark SET snapshot_status = ? WHERE id = ?;

-- name: UpdateReadableStatus :exec
UPDATE bookmark SET readable_status = ? WHERE id = ?;
