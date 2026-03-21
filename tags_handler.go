package main

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
)

type SearchTagsResponse struct {
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

func (h *handler) searchTags(w http.ResponseWriter, r *http.Request) {
	q, err := queryParam(r, "q", "")
	if err != nil || q == "" {
		writeError(w, http.StatusUnprocessableEntity, "q parameter is required")
		return
	}

	limit, err := queryParam(r, "limit", 10)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}
	if limit > 100 {
		limit = 100
	}

	names, err := h.loadTagNames(r.Context())
	if err != nil {
		serverError(w, "failed to load tags", err)
		return
	}

	prefix := strings.ToLower(q)
	start := sort.SearchStrings(names, prefix)

	tags := make([]string, 0, limit)
	for i := start; i < len(names) && len(tags) < limit; i++ {
		if strings.HasPrefix(names[i], prefix) {
			tags = append(tags, names[i])
		} else {
			break
		}
	}

	writeJSON(w, http.StatusOK, SearchTagsResponse{Tags: tags})
}
