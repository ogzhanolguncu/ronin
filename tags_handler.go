package main

import (
	"context"
	"net/http"
)

type Tag struct {
	Name  string `db:"name" json:"name"`
	Count int    `db:"count" json:"count"`
}

type TagsResponse struct {
	Tags []Tag `json:"tags"`
}

const tagCacheKey = "tags"

func (h *handler) loadTags(ctx context.Context) ([]Tag, error) {
	if cached, ok := h.tagCache.Get(tagCacheKey); ok {
		return cached.([]Tag), nil
	}
	var tags []Tag
	if err := h.store.SelectContext(ctx, &tags, "SELECT name, count FROM tag ORDER BY name"); err != nil {
		return nil, err
	}
	h.tagCache.Set(tagCacheKey, tags, 0)
	return tags, nil
}

func (h *handler) invalidateTagCache() {
	h.tagCache.Delete(tagCacheKey)
}

func (h *handler) getTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.loadTags(r.Context())
	if err != nil {
		serverError(w, "failed to load tags", err)
		return
	}

	if tags == nil {
		tags = []Tag{}
	}

	writeJSON(w, http.StatusOK, TagsResponse{Tags: tags})
}
