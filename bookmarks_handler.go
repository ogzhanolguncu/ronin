package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
)

func (h *handler) getBookmarks(w http.ResponseWriter, r *http.Request) {
	limit, err := queryParam(r, "limit", 50)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}
	cursor, err := queryParam(r, "cursor", 0)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid cursor: %s", err.Error()))
		return
	}
	archived, err := queryParam(r, "archived", -1)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid archived: %s", err.Error()))
		return
	}
	read, err := queryParam(r, "read", -1)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid read: %s", err.Error()))
		return
	}

	query := bookmarkBaseQuery + " WHERE 1=1"
	var args []any

	if cursor > 0 {
		query += " AND bm.id > ?"
		args = append(args, cursor)
	}
	if archived != -1 {
		query += " AND bm.archived = ?"
		args = append(args, archived)
	}
	if read != -1 {
		query += " AND bm.read = ?"
		args = append(args, read)
	}

	query += " GROUP BY bm.id ORDER BY bm.id ASC LIMIT ?"
	args = append(args, limit+1)

	var response ListBookmarksResponse
	err = h.store.SelectContext(r.Context(), &response.Bookmarks, query, args...)
	if err != nil {
		serverError(w, "failed to query bookmarks", err)
		return
	}

	for i := range response.Bookmarks {
		response.Bookmarks[i].parseTags()
	}

	if len(response.Bookmarks) > limit {
		response.Bookmarks = response.Bookmarks[:limit]
		nextCursor := response.Bookmarks[limit-1].ID
		response.Meta.Cursor = &nextCursor
	}

	writeJSON(w, http.StatusOK, response)
}

func (h *handler) searchBookmarks(w http.ResponseWriter, r *http.Request) {
	q, err := queryParam(r, "q", "")
	if err != nil || q == "" {
		writeError(w, http.StatusUnprocessableEntity, "q parameter is required")
		return
	}
	limit, err := queryParam(r, "limit", 50)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}

	var response ListBookmarksResponse
	err = h.store.SelectContext(r.Context(), &response.Bookmarks,
		bookmarkBaseQuery+`
		WHERE bm.id IN (
			SELECT rowid FROM bookmark_fts WHERE bookmark_fts MATCH ?
		)
		GROUP BY bm.id
		ORDER BY bm.id DESC
		LIMIT ?`,
		q, limit,
	)
	if err != nil {
		serverError(w, "failed to search bookmarks", err)
		return
	}

	for i := range response.Bookmarks {
		response.Bookmarks[i].parseTags()
	}

	writeJSON(w, http.StatusOK, response)
}

func (h *handler) getBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := pathParamInt(r, "id")
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	var response Bookmark
	err = h.store.GetContext(r.Context(), &response,
		bookmarkBaseQuery+`
		WHERE bm.id = ?
		GROUP BY bm.id`,
		id,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		serverError(w, "failed to query bookmark", err)
		return
	}

	response.parseTags()

	writeJSON(w, http.StatusOK, response)
}

func (h *handler) createBookmark(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[CreateBookmarkRequest](r, w)
	if !ok {
		return
	}

	if req.URL == "" {
		writeError(w, http.StatusUnprocessableEntity, "URL is required")
		return
	}
	if len(req.URL) > 2048 {
		writeError(w, http.StatusUnprocessableEntity, "URL cannot be longer than 2048")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}

	var bmID int64
	err := WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		result, err := tx.ExecContext(
			r.Context(),
			`INSERT INTO bookmark (url, title, description, notes) VALUES (?, ?, ?, ?)`,
			req.URL,
			req.Title,
			req.Description,
			req.Notes,
		)
		if err != nil {
			return fmt.Errorf("failed to create bookmark: %w", err)
		}

		bmID, err = result.LastInsertId()
		if err != nil {
			return fmt.Errorf("failed to get last inserted bookmark id: %w", err)
		}

		if err := upsertTagsAndLink(r.Context(), tx, bmID, req.Tags); err != nil {
			return err
		}

		return insertFTS(
			r.Context(),
			tx,
			bmID,
			req.Title,
			req.Description,
			req.Notes,
			req.URL,
			req.Tags,
		)
	})
	if err != nil {
		if IsUniqueConstraintErr(err) {
			writeError(w, http.StatusConflict, "bookmark already exists")
			return
		}
		serverError(w, "failed to create bookmark", err)
		return
	}

	h.invalidateTagCache()
	writeJSON(w, http.StatusCreated, map[string]int64{"id": bmID})
}

func (h *handler) updateBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := pathParamInt(r, "id")
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	req, ok := decode[UpdateBookmarkRequest](r, w)
	if !ok {
		return
	}

	err = WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		result, err := tx.ExecContext(
			r.Context(),
			`UPDATE bookmark SET url = ?, title = ?, description = ?, notes = ? WHERE id = ?`,
			req.URL,
			req.Title,
			req.Description,
			req.Notes,
			id,
		)
		if err != nil {
			return fmt.Errorf("failed to update bookmark: %w", err)
		}
		rows, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("failed to check rows affected: %w", err)
		}
		if rows == 0 {
			return ErrNotFound
		}

		if _, err = tx.ExecContext(r.Context(), "DELETE FROM bookmark_tag WHERE bookmark_id = ?", id); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
		}

		if err = upsertTagsAndLink(r.Context(), tx, id, req.Tags); err != nil {
			return err
		}

		if err = deleteFTS(r.Context(), tx, id); err != nil {
			return err
		}

		return insertFTS(r.Context(), tx, id, req.Title, req.Description, req.Notes, req.URL, req.Tags)
	})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		serverError(w, "failed to update bookmark", err)
		return
	}

	h.invalidateTagCache()
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) deleteBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := pathParamInt(r, "id")
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	err = WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		if err := deleteFTS(r.Context(), tx, int64(id)); err != nil {
			return err
		}

		result, err := tx.ExecContext(r.Context(), "DELETE FROM bookmark WHERE id = ?", id)
		if err != nil {
			return fmt.Errorf("failed to delete bookmark: %w", err)
		}
		rows, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("failed to check rows affected: %w", err)
		}
		if rows == 0 {
			return ErrNotFound
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		serverError(w, "failed to delete bookmark", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) deleteBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[DeleteBookmarkRequest](r, w)
	if !ok {
		return
	}

	err := WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		for _, id := range req.IDs {
			if err := deleteFTS(r.Context(), tx, int64(id)); err != nil {
				return err
			}
		}
		if err := bulkDelete(r.Context(), tx, "bookmark", "id", req.IDs); err != nil {
			return fmt.Errorf("failed to delete bookmarks: %w", err)
		}
		return nil
	})
	if err != nil {
		serverError(w, "failed to delete bookmarks", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) archiveBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[ArchiveBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "at least 1 archive entry is required")
		return
	}

	entries := make([]BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = BulkCaseEntry{ID: e.ID, Value: e.Archived}
	}

	if err := bulkCaseUpdate(r.Context(), h.store, "bookmark", "archived", entries); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to archive bookmarks")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) readBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[ReadBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "at least 1 read entry is required")
		return
	}

	entries := make([]BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = BulkCaseEntry{ID: e.ID, Value: e.Read}
	}

	if err := bulkCaseUpdate(r.Context(), h.store, "bookmark", "read", entries); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read bookmarks")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
