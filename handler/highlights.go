package handler

import (
	"fmt"
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store"
	"github.com/ogzhanolguncu/ronin/store/dbgen"
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

	highlights, err := h.store.GetHighlightsByBookmark(r.Context(), id)
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

	created, err := h.store.CreateHighlight(r.Context(), dbgen.CreateHighlightParams{
		BookmarkID:  bookmarkID,
		Text:        req.Text,
		Note:        req.Note,
		Color:       req.Color,
		StartPath:   req.StartPath,
		StartOffset: int64(req.StartOffset),
		EndPath:     req.EndPath,
		EndOffset:   int64(req.EndOffset),
	})
	if err != nil {
		if store.IsForeignKeyConstraintErr(err) {
			httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		httputil.ServerError(w, "failed to create highlight", err)
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

	highlight, err := h.store.GetHighlight(r.Context(), id)
	if err != nil {
		writeNotFoundOrErr(w, err, "highlight not found", "failed to query highlight")
		return
	}

	note := req.Note
	color := req.Color
	if color == "" {
		color = highlight.Color
	}

	if _, err := h.store.UpdateHighlight(r.Context(), id, note, color); err != nil {
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

	result, err := h.store.DeleteHighlight(r.Context(), id)
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
