package handler

import (
	"context"
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
)

const tagCacheKey = "tags"

func (h *Handler) loadTags(ctx context.Context) ([]model.Tag, error) {
	if cached, ok := h.tagCache.Get(tagCacheKey); ok {
		return cached.([]model.Tag), nil
	}
	var tags []model.Tag
	if err := h.store.ReadDB.SelectContext(ctx, &tags, "SELECT name, count FROM tag ORDER BY name"); err != nil {
		return nil, err
	}
	h.tagCache.Set(tagCacheKey, tags, 0)
	return tags, nil
}

func (h *Handler) invalidateTagCache() {
	h.tagCache.Delete(tagCacheKey)
}

func (h *Handler) getTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.loadTags(r.Context())
	if err != nil {
		httputil.ServerError(w, "failed to load tags", err)
		return
	}

	if tags == nil {
		tags = []model.Tag{}
	}

	httputil.WriteJSON(w, http.StatusOK, model.TagsResponse{Tags: tags})
}
