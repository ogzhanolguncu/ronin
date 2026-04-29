package handler

import (
	"database/sql"
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
	"github.com/ogzhanolguncu/ronin/store/dbgen"
	"github.com/ogzhanolguncu/ronin/urlutil"
)

func (h *Handler) getBookmarkCounts(w http.ResponseWriter, r *http.Request) {
	counts, err := h.store.GetBookmarkCounts(r.Context())
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
	var totalCount int

	sf := store.BookmarkFilters{Where: f.where, Args: f.args}

	if q != "" {
		match := store.PrepareSearchQuery(q)

		var bookmarks []model.Bookmark
		bookmarks, totalCount, err = h.store.SearchBookmarks(r.Context(), match, sf, limit, offset)
		if err != nil {
			httputil.ServerError(w, "failed to search bookmarks", err)
			return
		}
		response.Bookmarks = bookmarks
	} else {
		sortParam, err := httputil.QueryParam(r, "sort", "newest")
		if err != nil {
			httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid sort: %s", err.Error()))
			return
		}
		orderBy := store.OrderByClause(sortParam)

		var bookmarks []model.Bookmark
		bookmarks, totalCount, err = h.store.ListBookmarks(r.Context(), sf, orderBy, limit, offset)
		if err != nil {
			httputil.ServerError(w, "failed to query bookmarks", err)
			return
		}
		response.Bookmarks = bookmarks
	}

	if response.Bookmarks == nil {
		response.Bookmarks = []model.Bookmark{}
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

	bm, err := h.store.GetBookmark(r.Context(), id)
	if err != nil {
		writeNotFoundOrErr(w, err, "bookmark not found", "failed to query bookmark")
		return
	}

	bm.ParseTags()
	httputil.WriteJSON(w, http.StatusOK, bm)
}

func (h *Handler) getBookmarkByURL(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		httputil.WriteError(w, http.StatusBadRequest, "url parameter is required")
		return
	}
	if normalized, err := urlutil.Normalize(rawURL); err == nil {
		rawURL = normalized
	}

	bm, err := h.store.GetBookmarkByURL(r.Context(), rawURL)
	if err != nil {
		writeNotFoundOrErr(w, err, "not found", "failed to query bookmark")
		return
	}

	bm.ParseTags()
	httputil.WriteJSON(w, http.StatusOK, bm)
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

	var err error
	req.URL, err = urlutil.Normalize(req.URL)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid URL: %s", err.Error()))
		return
	}

	var bmID int64
	err = h.store.WithTx(r.Context(), func(q *dbgen.Queries, tx *sql.Tx) error {
		var txErr error
		bmID, txErr = q.CreateBookmark(r.Context(), dbgen.CreateBookmarkParams{
			Url:          req.URL,
			Title:        req.Title,
			Description:  req.Description,
			Notes:        req.Notes,
			Favorite:     store.BoolToInt64(req.Favorite),
			CollectionID: store.NullInt64FromPtr(req.CollectionID),
		})
		if txErr != nil {
			return fmt.Errorf("failed to create bookmark: %w", txErr)
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

	h.generateAssets(bmID, req.URL)

	created, err := h.store.GetBookmark(r.Context(), bmID)
	if err != nil {
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

	if req.URL == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "URL is required")
		return
	}

	req.URL, err = urlutil.Normalize(req.URL)
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid URL: %s", err.Error()))
		return
	}

	oldURL, err := h.store.GetBookmarkURL(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
		return
	}

	err = h.store.WithTx(r.Context(), func(q *dbgen.Queries, tx *sql.Tx) error {
		result, txErr := q.UpdateBookmark(r.Context(), dbgen.UpdateBookmarkParams{
			Url:          req.URL,
			Title:        req.Title,
			Description:  req.Description,
			Notes:        req.Notes,
			Favorite:     store.BoolToInt64(req.Favorite),
			CollectionID: store.NullInt64FromPtr(req.CollectionID),
			ID:           id,
		})
		if txErr != nil {
			return fmt.Errorf("failed to update bookmark: %w", txErr)
		}
		rows, txErr := result.RowsAffected()
		if txErr != nil {
			return fmt.Errorf("failed to check rows affected: %w", txErr)
		}
		if rows == 0 {
			return model.ErrNotFound
		}

		if txErr = q.DeleteBookmarkTags(r.Context(), id); txErr != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", txErr)
		}

		return store.UpsertTagsAndLink(r.Context(), tx, id, req.Tags)
	})
	if err != nil {
		if store.IsUniqueConstraintErr(err) {
			httputil.WriteError(w, http.StatusConflict, "bookmark already exists")
			return
		}
		writeNotFoundOrErr(w, err, "bookmark not found", "failed to update bookmark")
		return
	}

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

	result, err := h.store.DeleteBookmark(r.Context(), id)
	if err != nil {
		httputil.ServerError(w, "failed to delete bookmark", err)
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
		return
	}

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

	if err := h.store.BulkDeleteBookmarks(r.Context(), "id", req.IDs); err != nil {
		httputil.ServerError(w, "failed to delete bookmarks", err)
		return
	}

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
	entries := make([]store.BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = store.BulkCaseEntry{ID: e.ID, Value: e.Archived}
	}
	h.bulkUpdate(w, r, "archived", entries)
}

func (h *Handler) readBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.ReadBookmarkRequest](r, w)
	if !ok {
		return
	}
	entries := make([]store.BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = store.BulkCaseEntry{ID: e.ID, Value: e.Read}
	}
	h.bulkUpdate(w, r, "read", entries)
}

func (h *Handler) favoriteBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.FavoriteBookmarkRequest](r, w)
	if !ok {
		return
	}
	entries := make([]store.BulkCaseEntry, len(req.IDs))
	for i, e := range req.IDs {
		entries[i] = store.BulkCaseEntry{ID: e.ID, Value: e.Favorite}
	}
	h.bulkUpdate(w, r, "favorite", entries)
}

func (h *Handler) bulkUpdate(w http.ResponseWriter, r *http.Request, column string, entries []store.BulkCaseEntry) {
	if len(entries) == 0 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "at least 1 entry is required")
		return
	}
	if err := h.store.BulkCaseUpdateBookmark(r.Context(), column, entries); err != nil {
		httputil.ServerError(w, "failed to update bookmarks", err)
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
	collectionSlug, _ := httputil.QueryParam(r, "collection", "")
	tagsParam, _ := httputil.QueryParam(r, "tags", "")
	domainsParam, _ := httputil.QueryParam(r, "domains", "")

	if collectionSlug != "" {
		f.where += " AND bm.collection_id = (SELECT id FROM collection WHERE slug = ?)"
		f.args = append(f.args, collectionSlug)
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
		f.args = append(f.args, 1-unread)
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
