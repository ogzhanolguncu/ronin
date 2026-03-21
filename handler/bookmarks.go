package handler

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store"
)

func (h *Handler) getBookmarks(w http.ResponseWriter, r *http.Request) {
	limit, err := httputil.QueryParam(r, "limit", 50)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}
	cursor, err := httputil.QueryParam(r, "cursor", 0)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid cursor: %s", err.Error()))
		return
	}
	archived, err := httputil.QueryParam(r, "archived", -1)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid archived: %s", err.Error()))
		return
	}
	read, err := httputil.QueryParam(r, "read", -1)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid read: %s", err.Error()))
		return
	}

	query := model.BookmarkBaseQuery + " WHERE 1=1"
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

	var response model.ListBookmarksResponse
	err = h.store.DB.SelectContext(r.Context(), &response.Bookmarks, query, args...)
	if err != nil {
		httputil.ServerError(w, "failed to query bookmarks", err)
		return
	}

	for i := range response.Bookmarks {
		response.Bookmarks[i].ParseTags()
	}

	if len(response.Bookmarks) > limit {
		response.Bookmarks = response.Bookmarks[:limit]
		nextCursor := response.Bookmarks[limit-1].ID
		response.Meta.Cursor = &nextCursor
	}

	httputil.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) searchBookmarks(w http.ResponseWriter, r *http.Request) {
	q, err := httputil.QueryParam(r, "q", "")
	if err != nil || q == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "q parameter is required")
		return
	}
	limit, err := httputil.QueryParam(r, "limit", 50)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}

	var response model.ListBookmarksResponse
	err = h.store.DB.SelectContext(r.Context(), &response.Bookmarks,
		model.BookmarkBaseQuery+`
		WHERE bm.id IN (
			SELECT rowid FROM bookmark_fts WHERE bookmark_fts MATCH ?
		)
		GROUP BY bm.id
		ORDER BY bm.id DESC
		LIMIT ?`,
		q, limit,
	)
	if err != nil {
		httputil.ServerError(w, "failed to search bookmarks", err)
		return
	}

	for i := range response.Bookmarks {
		response.Bookmarks[i].ParseTags()
	}

	httputil.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) getBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	var response model.Bookmark
	err = h.store.DB.GetContext(r.Context(), &response,
		model.BookmarkBaseQuery+`
		WHERE bm.id = ?
		GROUP BY bm.id`,
		id,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		httputil.ServerError(w, "failed to query bookmark", err)
		return
	}

	response.ParseTags()

	httputil.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) createBookmark(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.CreateBookmarkRequest](r, w)
	if !ok {
		return
	}

	if req.URL == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "URL is required")
		return
	}
	if len(req.URL) > 2048 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "URL cannot be longer than 2048")
		return
	}
	if req.Title == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}

	var bmID int64
	err := store.WithTx(r.Context(), h.store.DB.DB, func(tx *sql.Tx) error {
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

		if err := store.UpsertTagsAndLink(r.Context(), tx, bmID, req.Tags); err != nil {
			return err
		}

		return store.InsertFTS(
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
		if store.IsUniqueConstraintErr(err) {
			httputil.WriteError(w, http.StatusConflict, "bookmark already exists")
			return
		}
		httputil.ServerError(w, "failed to create bookmark", err)
		return
	}

	h.invalidateTagCache()
	httputil.WriteJSON(w, http.StatusCreated, map[string]int64{"id": bmID})
}

func (h *Handler) updateBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	req, ok := httputil.Decode[model.UpdateBookmarkRequest](r, w)
	if !ok {
		return
	}

	err = store.WithTx(r.Context(), h.store.DB.DB, func(tx *sql.Tx) error {
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
			return model.ErrNotFound
		}

		if _, err = tx.ExecContext(r.Context(), "DELETE FROM bookmark_tag WHERE bookmark_id = ?", id); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
		}

		if err = store.UpsertTagsAndLink(r.Context(), tx, id, req.Tags); err != nil {
			return err
		}

		if err = store.DeleteFTS(r.Context(), tx, id); err != nil {
			return err
		}

		return store.InsertFTS(r.Context(), tx, id, req.Title, req.Description, req.Notes, req.URL, req.Tags)
	})
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		httputil.ServerError(w, "failed to update bookmark", err)
		return
	}

	h.invalidateTagCache()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	err = store.WithTx(r.Context(), h.store.DB.DB, func(tx *sql.Tx) error {
		if err := store.DeleteFTS(r.Context(), tx, int64(id)); err != nil {
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
			return model.ErrNotFound
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		httputil.ServerError(w, "failed to delete bookmark", err)
		return
	}

	h.invalidateTagCache()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.DeleteBookmarkRequest](r, w)
	if !ok {
		return
	}

	err := store.WithTx(r.Context(), h.store.DB.DB, func(tx *sql.Tx) error {
		for _, id := range req.IDs {
			if err := store.DeleteFTS(r.Context(), tx, int64(id)); err != nil {
				return err
			}
		}
		if err := store.BulkDelete(r.Context(), tx, "bookmark", "id", req.IDs); err != nil {
			return fmt.Errorf("failed to delete bookmarks: %w", err)
		}
		return nil
	})
	if err != nil {
		httputil.ServerError(w, "failed to delete bookmarks", err)
		return
	}

	h.invalidateTagCache()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) archiveBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.ArchiveBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "at least 1 archive entry is required")
		return
	}

	entries := make([]store.BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = store.BulkCaseEntry{ID: e.ID, Value: e.Archived}
	}

	if err := store.BulkCaseUpdate(r.Context(), h.store.DB, "bookmark", "archived", entries); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "failed to archive bookmarks")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) readBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.ReadBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "at least 1 read entry is required")
		return
	}

	entries := make([]store.BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = store.BulkCaseEntry{ID: e.ID, Value: e.Read}
	}

	if err := store.BulkCaseUpdate(r.Context(), h.store.DB, "bookmark", "read", entries); err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "failed to read bookmarks")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
