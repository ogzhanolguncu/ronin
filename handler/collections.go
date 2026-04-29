package handler

import (
	"fmt"
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store"
)

func (h *Handler) getCollections(w http.ResponseWriter, r *http.Request) {
	collections, err := h.store.ListCollections(r.Context())
	if err != nil {
		httputil.ServerError(w, "failed to query collections", err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, model.CollectionsResponse{Collections: collections})
}

func (h *Handler) getCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid collection id: %s", err.Error()))
		return
	}

	c, err := h.store.GetCollection(r.Context(), id)
	if err != nil {
		writeNotFoundOrErr(w, err, "collection not found", "failed to query collection")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, c)
}

func (h *Handler) createCollection(w http.ResponseWriter, r *http.Request) {
	req, ok := httputil.Decode[model.CreateCollectionRequest](r, w)
	if !ok {
		return
	}

	if req.Name == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "name is required")
		return
	}
	if req.Slug == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "slug is required")
		return
	}
	if req.ColorID < 1 || req.ColorID > 10 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "color_id must be between 1 and 10")
		return
	}

	created, err := h.store.CreateCollection(r.Context(), req.Name, req.Slug, req.ColorID)
	if err != nil {
		if store.IsUniqueConstraintErr(err) {
			httputil.WriteError(w, http.StatusConflict, "collection with this slug already exists")
			return
		}
		httputil.ServerError(w, "failed to create collection", err)
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, created)
}

func (h *Handler) updateCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid collection id: %s", err.Error()))
		return
	}

	req, ok := httputil.Decode[model.UpdateCollectionRequest](r, w)
	if !ok {
		return
	}

	if req.Name == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "name is required")
		return
	}
	if req.Slug == "" {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "slug is required")
		return
	}
	if req.ColorID < 1 || req.ColorID > 10 {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "color_id must be between 1 and 10")
		return
	}

	result, err := h.store.UpdateCollection(r.Context(), id, req.Name, req.Slug, req.ColorID)
	if err != nil {
		if store.IsUniqueConstraintErr(err) {
			httputil.WriteError(w, http.StatusConflict, "collection with this slug already exists")
			return
		}
		httputil.ServerError(w, "failed to update collection", err)
		return
	}

	rows, err := result.RowsAffected()
	if err != nil {
		httputil.ServerError(w, "failed to check rows affected", err)
		return
	}
	if rows == 0 {
		httputil.WriteError(w, http.StatusNotFound, "collection not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid collection id: %s", err.Error()))
		return
	}

	result, err := h.store.DeleteCollection(r.Context(), id)
	if err != nil {
		httputil.ServerError(w, "failed to delete collection", err)
		return
	}

	rows, err := result.RowsAffected()
	if err != nil {
		httputil.ServerError(w, "failed to check rows affected", err)
		return
	}
	if rows == 0 {
		httputil.WriteError(w, http.StatusNotFound, "collection not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
