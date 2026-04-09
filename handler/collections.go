package handler

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store"
)

const collectionCacheKey = "collections"

func (h *Handler) loadCollections(ctx context.Context) ([]model.Collection, error) {
	if cached, ok := h.collectionCache.Get(collectionCacheKey); ok {
		return cached.([]model.Collection), nil
	}
	var collections []model.Collection
	err := h.store.ReadDB.SelectContext(ctx, &collections,
		`SELECT id, name, slug, color_id, created_at, updated_at
		 FROM collection ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	if collections == nil {
		collections = []model.Collection{}
	}
	h.collectionCache.Set(collectionCacheKey, collections, 0)
	return collections, nil
}

func (h *Handler) invalidateCollectionCache() {
	h.collectionCache.Delete(collectionCacheKey)
	h.invalidateAuthPageCache()
}

func (h *Handler) getCollections(w http.ResponseWriter, r *http.Request) {
	collections, err := h.loadCollections(r.Context())
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

	var c model.Collection
	err = h.store.ReadDB.GetContext(r.Context(), &c,
		`SELECT id, name, slug, color_id, created_at, updated_at
		 FROM collection WHERE id = ?`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httputil.WriteError(w, http.StatusNotFound, "collection not found")
			return
		}
		httputil.ServerError(w, "failed to query collection", err)
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

	result, err := h.store.WriteDB.ExecContext(r.Context(),
		`INSERT INTO collection (name, slug, color_id) VALUES (?, ?, ?)`,
		req.Name, req.Slug, req.ColorID)
	if err != nil {
		if store.IsUniqueConstraintErr(err) {
			httputil.WriteError(w, http.StatusConflict, "collection with this slug already exists")
			return
		}
		httputil.ServerError(w, "failed to create collection", err)
		return
	}

	h.invalidateCollectionCache()
	id, err := result.LastInsertId()
	if err != nil {
		httputil.ServerError(w, "failed to get last insert id", err)
		return
	}

	var created model.Collection
	if err := h.store.ReadDB.GetContext(r.Context(), &created,
		`SELECT id, name, slug, color_id, created_at, updated_at FROM collection WHERE id = ?`, id); err != nil {
		httputil.ServerError(w, "failed to fetch created collection", err)
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

	result, err := h.store.WriteDB.ExecContext(r.Context(),
		`UPDATE collection SET name = ?, slug = ?, color_id = ? WHERE id = ?`,
		req.Name, req.Slug, req.ColorID, id)
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

	h.invalidateCollectionCache()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid collection id: %s", err.Error()))
		return
	}

	result, err := h.store.WriteDB.ExecContext(r.Context(),
		`DELETE FROM collection WHERE id = ?`, id)
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

	h.invalidateCollectionCache()
	w.WriteHeader(http.StatusNoContent)
}
