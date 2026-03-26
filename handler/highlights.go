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

var validHighlightColors = map[string]bool{
	"yellow": true,
	"green":  true,
	"blue":   true,
	"pink":   true,
}

func (h *Handler) getHighlights(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	var highlights []model.Highlight
	err = h.store.ReadDB.SelectContext(r.Context(), &highlights,
		`SELECT id, bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset, created_at, updated_at
		 FROM highlight WHERE bookmark_id = ? ORDER BY created_at ASC`, id)
	if err != nil {
		httputil.ServerError(w, "failed to query highlights", err)
		return
	}
	if highlights == nil {
		highlights = []model.Highlight{}
	}

	httputil.WriteJSON(w, http.StatusOK, model.HighlightsResponse{Highlights: highlights})
}

func (h *Handler) createHighlight(w http.ResponseWriter, r *http.Request) {
	bookmarkID, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	req, ok := httputil.Decode[model.CreateHighlightRequest](r, w)
	if !ok {
		return
	}

	if req.Text == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "text is required")
		return
	}
	if len(req.Text) > 4096 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "text cannot be longer than 4096 characters")
		return
	}
	if len(req.Note) > 4096 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "note cannot be longer than 4096 characters")
		return
	}
	if req.Color == "" {
		req.Color = "yellow"
	}
	if !validHighlightColors[req.Color] {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "color must be one of: yellow, green, blue, pink")
		return
	}
	if req.StartPath == "" || req.EndPath == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "start_path and end_path are required")
		return
	}

	result, err := h.store.WriteDB.ExecContext(r.Context(),
		`INSERT INTO highlight (bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		bookmarkID, req.Text, req.Note, req.Color, req.StartPath, req.StartOffset, req.EndPath, req.EndOffset)
	if err != nil {
		if store.IsForeignKeyConstraintErr(err) {
			httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		httputil.ServerError(w, "failed to create highlight", err)
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		httputil.ServerError(w, "failed to get last insert id", err)
		return
	}

	var created model.Highlight
	if err := h.store.ReadDB.GetContext(r.Context(), &created,
		`SELECT id, bookmark_id, text, note, color, start_path, start_offset, end_path, end_offset, created_at, updated_at
		 FROM highlight WHERE id = ?`, id); err != nil {
		httputil.ServerError(w, "failed to fetch created highlight", err)
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) updateHighlight(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid highlight id: %s", err.Error()))
		return
	}

	req, ok := httputil.Decode[model.UpdateHighlightRequest](r, w)
	if !ok {
		return
	}

	if len(req.Note) > 4096 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "note cannot be longer than 4096 characters")
		return
	}
	if req.Color != "" && !validHighlightColors[req.Color] {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "color must be one of: yellow, green, blue, pink")
		return
	}

	var highlight model.Highlight
	err = h.store.ReadDB.GetContext(r.Context(), &highlight,
		`SELECT id, note, color FROM highlight WHERE id = ?`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httputil.WriteError(w, http.StatusNotFound, "highlight not found")
			return
		}
		httputil.ServerError(w, "failed to query highlight", err)
		return
	}

	note := req.Note
	color := req.Color
	if color == "" {
		color = highlight.Color
	}

	_, err = h.store.WriteDB.ExecContext(r.Context(),
		`UPDATE highlight SET note = ?, color = ? WHERE id = ?`,
		note, color, id)
	if err != nil {
		httputil.ServerError(w, "failed to update highlight", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteHighlight(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid highlight id: %s", err.Error()))
		return
	}

	result, err := h.store.WriteDB.ExecContext(r.Context(),
		`DELETE FROM highlight WHERE id = ?`, id)
	if err != nil {
		httputil.ServerError(w, "failed to delete highlight", err)
		return
	}

	rows, err := result.RowsAffected()
	if err != nil {
		httputil.ServerError(w, "failed to check rows affected", err)
		return
	}
	if rows == 0 {
		httputil.WriteError(w, http.StatusNotFound, "highlight not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
