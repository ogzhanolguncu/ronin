package handler

import (
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
)

func (h *Handler) getTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.store.ListActiveTags(r.Context())
	if err != nil {
		httputil.ServerError(w, "failed to load tags", err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, model.TagsResponse{Tags: tags})
}
