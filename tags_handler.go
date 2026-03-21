package main

import (
	"context"
	"net/http"
)

type TagsResponse struct {
	Tags []string `json:"tags"`
}

const tagCacheKey = "tags"

func (h *handler) loadTagNames(ctx context.Context) ([]string, error) {
	if cached, ok := h.tagCache.Get(tagCacheKey); ok {
		return cached.([]string), nil
	}
	var names []string
	if err := h.store.SelectContext(ctx, &names, "SELECT name FROM tag ORDER BY name"); err != nil {
		return nil, err
	}
	h.tagCache.Set(tagCacheKey, names, 0)
	return names, nil
}

func (h *handler) invalidateTagCache() {
	h.tagCache.Delete(tagCacheKey)
}

func (h *handler) getTags(w http.ResponseWriter, r *http.Request) {
	names, err := h.loadTagNames(r.Context())
	if err != nil {
		serverError(w, "failed to load tags", err)
		return
	}

	if names == nil {
		names = []string{}
	}

	writeJSON(w, http.StatusOK, TagsResponse{Tags: names})
}
