package main

import (
	"fmt"
	"net/http"
	"strings"
)

var likeEscaper = strings.NewReplacer(`%`, `\%`, `_`, `\_`)

type SearchTagsResponse struct {
	Tags []string `json:"tags"`
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

	escaped := likeEscaper.Replace(q)

	var tags []string
	err = h.store.SelectContext(r.Context(), &tags,
		"SELECT name FROM tag WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?",
		escaped+"%", limit,
	)
	if err != nil {
		serverError(w, "failed to search tags", err)
		return
	}

	if tags == nil {
		tags = []string{}
	}

	writeJSON(w, http.StatusOK, SearchTagsResponse{Tags: tags})
}
