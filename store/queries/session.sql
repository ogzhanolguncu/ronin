-- name: CreateSession :exec
INSERT INTO session (token, expires_at) VALUES (?, ?);

-- name: DeleteSession :exec
DELETE FROM session WHERE token = ?;

-- name: DeleteExpiredSessions :exec
DELETE FROM session WHERE expires_at < ?;

-- name: CountValidSessions :one
SELECT COUNT(*) FROM session WHERE token = ? AND expires_at > ?;
