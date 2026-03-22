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

func (h *Handler) getCollections(w http.ResponseWriter, r *http.Request) {
	var collections []model.Collection
	err := h.store.DB.SelectContext(r.Context(), &collections,
		`SELECT id, name, slug, color_id, created_at, updated_at
		 FROM collection ORDER BY name ASC`)
	if err != nil {
		httputil.ServerError(w, "failed to query collections", err)
		return
	}
	if collections == nil {
		collections = []model.Collection{}
	}
	httputil.WriteJSON(w, http.StatusOK, collections)
}

func (h *Handler) getCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid collection id: %s", err.Error()))
		return
	}

	var c model.Collection
	err = h.store.DB.GetContext(r.Context(), &c,
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

	result, err := h.store.DB.ExecContext(r.Context(),
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

	id, _ := result.LastInsertId()
	httputil.WriteJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) updateCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid collection id: %s", err.Error()))
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

	result, err := h.store.DB.ExecContext(r.Context(),
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

	rows, _ := result.RowsAffected()
	if rows == 0 {
		httputil.WriteError(w, http.StatusNotFound, "collection not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid collection id: %s", err.Error()))
		return
	}

	result, err := h.store.DB.ExecContext(r.Context(),
		`DELETE FROM collection WHERE id = ?`, id)
	if err != nil {
		httputil.ServerError(w, "failed to delete collection", err)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		httputil.WriteError(w, http.StatusNotFound, "collection not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
