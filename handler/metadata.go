package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/url"
	"strings"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/metadata"
)

func (h *Handler) getMetadata(w http.ResponseWriter, r *http.Request) {
	rawURL, err := httputil.QueryParam(r, "url", "")
	if err != nil || rawURL == "" {
		httputil.WriteError(w, http.StatusBadRequest, "missing url parameter")
		return
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		httputil.WriteError(w, http.StatusBadRequest, "invalid url: only http and https are allowed")
		return
	}

	if err := metadata.RejectPrivateHost(parsed.Hostname()); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check cache
	if cached, found := h.metadataCache.Get(rawURL); found {
		httputil.WriteJSON(w, http.StatusOK, cached.(*metadata.Response))
		return
	}

	meta, err := h.fetchMetadata(r.Context(), rawURL)
	if err != nil {
		httputil.WriteError(w, http.StatusBadGateway, "failed to fetch URL")
		return
	}

	h.metadataCache.Set(rawURL, meta, 0) // use default expiration
	httputil.WriteJSON(w, http.StatusOK, meta)
}

func (h *Handler) fetchMetadata(ctx context.Context, rawURL string) (*metadata.Response, error) {
	client := metadata.NewHTTPClient()

	req, err := metadata.NewRequest(ctx, http.MethodGet, rawURL)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	parsed, _ := url.Parse(rawURL)

	ct := resp.Header.Get("Content-Type")
	baseOrigin := parsed.Scheme + "://" + parsed.Host
	domain := parsed.Hostname()

	if !strings.Contains(ct, "text/html") {
		go h.fetchAndStoreFavicon(domain, baseOrigin, "")
		return &metadata.Response{URL: rawURL, Favicon: "/api/v1/favicons/" + domain}, nil
	}

	// Streaming read with early </head> termination
	body := metadata.ReadUntilHeadClose(resp.Body)
	meta, iconURL := metadata.ParseHTML(bytes.NewReader(body), parsed)
	meta.URL = rawURL
	meta.Favicon = "/api/v1/favicons/" + domain

	go h.fetchAndStoreFavicon(domain, baseOrigin, iconURL)

	return &meta, nil
}
