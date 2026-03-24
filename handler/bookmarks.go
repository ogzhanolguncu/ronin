package handler

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store"
)

func (h *Handler) getBookmarkCounts(w http.ResponseWriter, r *http.Request) {
	var counts model.BookmarkCounts
	err := h.store.ReadDB.GetContext(r.Context(), &counts, `
    SELECT
        COALESCE(SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END), 0)    AS all_count,
        COALESCE(SUM(CASE WHEN favorite = 1 THEN 1 ELSE 0 END), 0)    AS favorites_count,
        COALESCE(SUM(CASE WHEN read = 0    THEN 1 ELSE 0 END), 0)     AS unread_count,
        COALESCE(SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END), 0)    AS archived_count
    FROM bookmark`)
	if err != nil {
		httputil.ServerError(w, "failed to load bookmark counts", err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, model.BookmarkCountsResponse{Counts: counts})
}

func (h *Handler) getBookmarks(w http.ResponseWriter, r *http.Request) {
	limit, err := httputil.QueryParam(r, "limit", 50)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}
	page, err := httputil.QueryParam(r, "page", 1)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid page: %s", err.Error()))
		return
	}
	if page < 1 {
		page = 1
	}

	q, _ := httputil.QueryParam(r, "q", "")
	f := parseBookmarkFilters(r)
	offset := (page - 1) * limit

	var response model.ListBookmarksResponse

	if q != "" {
		// Full-text search mode
		terms := strings.Fields(q)
		for i, t := range terms {
			if !strings.HasSuffix(t, "*") {
				terms[i] = t + "*"
			}
		}
		q = strings.Join(terms, " ")

		query := `
			SELECT bm.id, bm.url, bm.title, bm.description, bm.notes,
			       bm.archived, bm.read, bm.favorite, bm.collection_id,
			       bm.created_at, bm.updated_at, bm.tags,
			       bm.snapshot_status, bm.readable_status,
			       (SELECT COUNT(*) FROM bookmark_fts JOIN bookmark bm ON bm.id = bookmark_fts.rowid WHERE bookmark_fts MATCH ?` + f.where + `) AS total_count,
			       highlight(bookmark_fts, 0, '<mark>', '</mark>') AS title_snippet,
			       snippet(bookmark_fts, 1, '<mark>', '</mark>', '…', 32) AS description_snippet
			FROM bookmark_fts
			JOIN bookmark bm ON bm.id = bookmark_fts.rowid
			WHERE bookmark_fts MATCH ?` + f.where + `
			ORDER BY bookmark_fts.rank
			LIMIT ? OFFSET ?`
		args := append([]any{q}, f.args...)
		args = append(args, q)
		args = append(args, f.args...)
		args = append(args, limit, offset)

		if err := h.store.ReadDB.SelectContext(r.Context(), &response.Bookmarks, query, args...); err != nil {
			httputil.ServerError(w, "failed to search bookmarks", err)
			return
		}
	} else {
		// Regular listing mode
		sortParam, err := httputil.QueryParam(r, "sort", "newest")
		if err != nil {
			httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid sort: %s", err.Error()))
			return
		}

		var orderBy string
		switch sortParam {
		case "oldest":
			orderBy = " ORDER BY bm.created_at ASC"
		case "az":
			orderBy = " ORDER BY bm.title ASC"
		case "za":
			orderBy = " ORDER BY bm.title DESC"
		default:
			orderBy = " ORDER BY bm.created_at DESC"
		}

		query := `
			SELECT bm.id, bm.url, bm.title, bm.description, bm.notes,
			       bm.archived, bm.read, bm.favorite, bm.collection_id,
			       bm.created_at, bm.updated_at, bm.tags,
			       bm.snapshot_status, bm.readable_status,
			       COUNT(*) OVER() AS total_count
			FROM bookmark bm
			WHERE 1=1` + f.where + orderBy + ` LIMIT ? OFFSET ?`
		args := append(f.args, limit, offset)

		if err := h.store.ReadDB.SelectContext(r.Context(), &response.Bookmarks, query, args...); err != nil {
			httputil.ServerError(w, "failed to query bookmarks", err)
			return
		}
	}

	if response.Bookmarks == nil {
		response.Bookmarks = []model.Bookmark{}
	}

	var totalCount int
	if len(response.Bookmarks) > 0 {
		totalCount = response.Bookmarks[0].TotalCount
	}

	for i := range response.Bookmarks {
		response.Bookmarks[i].ParseTags()
	}

	response.Meta = httputil.PaginationMeta(totalCount, page, limit)
	httputil.WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) getBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	var response model.Bookmark
	err = h.store.ReadDB.GetContext(r.Context(), &response,
		model.BookmarkBaseQuery+`
		WHERE bm.id = ?`,
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
	err := store.WithTx(r.Context(), h.store.WriteDB, func(tx *sql.Tx) error {
		result, err := tx.ExecContext(
			r.Context(),
			`INSERT INTO bookmark (url, title, description, notes, favorite, collection_id) VALUES (?, ?, ?, ?, ?, ?)`,
			req.URL,
			req.Title,
			req.Description,
			req.Notes,
			req.Favorite,
			req.CollectionID,
		)
		if err != nil {
			return fmt.Errorf("failed to create bookmark: %w", err)
		}

		bmID, err = result.LastInsertId()
		if err != nil {
			return fmt.Errorf("failed to get last inserted bookmark id: %w", err)
		}

		return store.UpsertTagsAndLink(r.Context(), tx, bmID, req.Tags)
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
	h.generateAssets(bmID, req.URL)

	var created model.Bookmark
	if err := h.store.ReadDB.GetContext(r.Context(), &created,
		model.BookmarkBaseQuery+` WHERE bm.id = ?`, bmID); err != nil {
		httputil.ServerError(w, "failed to fetch created bookmark", err)
		return
	}
	created.ParseTags()
	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) updateBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	req, ok := httputil.Decode[model.UpdateBookmarkRequest](r, w)
	if !ok {
		return
	}

	var oldURL string
	if err := h.store.ReadDB.GetContext(r.Context(), &oldURL, "SELECT url FROM bookmark WHERE id = ?", id); err != nil {
		httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
		return
	}

	err = store.WithTx(r.Context(), h.store.WriteDB, func(tx *sql.Tx) error {
		result, err := tx.ExecContext(
			r.Context(),
			`UPDATE bookmark SET url = ?, title = ?, description = ?, notes = ?, favorite = ?, collection_id = ? WHERE id = ?`,
			req.URL,
			req.Title,
			req.Description,
			req.Notes,
			req.Favorite,
			req.CollectionID,
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

		return store.UpsertTagsAndLink(r.Context(), tx, id, req.Tags)
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

	if req.URL != oldURL {
		go func() {
			if err := os.RemoveAll(filepath.Join(h.dataDir, "assets", strconv.FormatInt(id, 10))); err != nil {
				slog.Warn("failed to remove assets", "bookmark_id", id, "err", err)
			}
		}()
		h.generateAssets(id, req.URL)
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	err = store.WithTx(r.Context(), h.store.WriteDB, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(r.Context(), "DELETE FROM bookmark_tag WHERE bookmark_id = ?", id); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
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
	go func() {
		if err := os.RemoveAll(filepath.Join(h.dataDir, "assets", strconv.FormatInt(id, 10))); err != nil {
			slog.Warn("failed to remove assets", "bookmark_id", id, "err", err)
		}
	}()

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.DeleteBookmarkRequest](r, w)
	if !ok {
		return
	}

	err := store.WithTx(r.Context(), h.store.WriteDB, func(tx *sql.Tx) error {
		if err := store.BulkDelete(r.Context(), tx, "bookmark_tag", "bookmark_id", req.IDs); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
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
	go func() {
		for _, id := range req.IDs {
			if err := os.RemoveAll(filepath.Join(h.dataDir, "assets", strconv.Itoa(id))); err != nil {
				slog.Warn("failed to remove assets", "bookmark_id", id, "err", err)
			}
		}
	}()

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

	if err := store.BulkCaseUpdate(r.Context(), h.store.WriteDB, "bookmark", "archived", entries); err != nil {
		httputil.ServerError(w, "failed to archive bookmarks", err)
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

	if err := store.BulkCaseUpdate(r.Context(), h.store.WriteDB, "bookmark", "read", entries); err != nil {
		httputil.ServerError(w, "failed to mark bookmarks as read", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) favoriteBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.FavoriteBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "at least 1 favorite entry is required")
		return
	}

	entries := make([]store.BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = store.BulkCaseEntry{ID: e.ID, Value: e.Favorite}
	}

	if err := store.BulkCaseUpdate(r.Context(), h.store.WriteDB, "bookmark", "favorite", entries); err != nil {
		httputil.ServerError(w, "failed to favorite bookmarks", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type bookmarkFilters struct {
	where string
	args  []any
}

func parseBookmarkFilters(r *http.Request) bookmarkFilters {
	var f bookmarkFilters

	favorite, _ := httputil.QueryParam(r, "favorite", -1)
	archived, _ := httputil.QueryParam(r, "archived", -1)
	unread, _ := httputil.QueryParam(r, "unread", -1)
	collection, _ := httputil.QueryParam(r, "collection", -1)
	tagsParam, _ := httputil.QueryParam(r, "tags", "")
	domainsParam, _ := httputil.QueryParam(r, "domains", "")

	if collection != -1 {
		f.where += " AND bm.collection_id = ?"
		f.args = append(f.args, collection)
	}
	if favorite != -1 {
		f.where += " AND bm.favorite = ?"
		f.args = append(f.args, favorite)
	}
	if archived != -1 {
		f.where += " AND bm.archived = ?"
		f.args = append(f.args, archived)
	}
	if unread != -1 {
		f.where += " AND bm.read = ?"
		f.args = append(f.args, 1-unread) // unread=1 means read=0
	}

	for tag := range strings.SplitSeq(tagsParam, ",") {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			f.where += " AND bm.tags LIKE ?"
			f.args = append(f.args, "%"+tag+"%")
		}
	}

	for domain := range strings.SplitSeq(domainsParam, ",") {
		domain = strings.TrimSpace(domain)
		if domain != "" {
			f.where += " AND bm.url LIKE ?"
			f.args = append(f.args, "%"+domain+"%")
		}
	}

	return f
}
