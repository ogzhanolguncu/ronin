package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/net/html"
)

const (
	maxHeadBytes    = 5 * 1024 * 1024 // 5MB absolute limit
	chunkSize       = 50 * 1024       // 50KB read chunks
	maxFaviconBytes = 10 * 1024       // 10KB favicon limit
	faviconMaxAge   = 24 * time.Hour
)

var defaultHeaders = map[string]string{
	"User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.9",
	"DNT":             "1",
}

type MetadataResponse struct {
	URL          string `json:"url"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Favicon      string `json:"favicon"`
	PreviewImage string `json:"preview_image,omitempty"`
}

func newMetadataRequest(ctx context.Context, method, rawURL string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, rawURL, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range defaultHeaders {
		req.Header.Set(k, v)
	}
	return req, nil
}

func newHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}
}

func (h *handler) getMetadata(w http.ResponseWriter, r *http.Request) {
	rawURL, err := queryParam(r, "url", "")
	if err != nil || rawURL == "" {
		writeError(w, http.StatusBadRequest, "missing url parameter")
		return
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		writeError(w, http.StatusBadRequest, "invalid url: only http and https are allowed")
		return
	}

	if err := rejectPrivateHost(parsed.Hostname()); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check cache
	if cached, found := h.metadataCache.Get(rawURL); found {
		writeJSON(w, http.StatusOK, cached.(*MetadataResponse))
		return
	}

	meta, err := h.fetchMetadata(r.Context(), rawURL)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch URL")
		return
	}

	h.metadataCache.Set(rawURL, meta, 0) // use default expiration
	writeJSON(w, http.StatusOK, meta)
}

func (h *handler) fetchMetadata(ctx context.Context, rawURL string) (*MetadataResponse, error) {
	client := newHTTPClient()

	req, err := newMetadataRequest(ctx, http.MethodGet, rawURL)
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
		return &MetadataResponse{URL: rawURL, Favicon: "/api/v1/favicons/" + domain}, nil
	}

	// Streaming read with early </head> termination
	body := readUntilHeadClose(resp.Body)
	meta := parseHTML(bytes.NewReader(body), parsed)
	meta.URL = rawURL
	meta.Favicon = "/api/v1/favicons/" + domain

	iconURL := parseFaviconFromHTML(body, parsed)
	go h.fetchAndStoreFavicon(domain, baseOrigin, iconURL)

	return &meta, nil
}

// readUntilHeadClose reads the response body in chunks and stops when </head> is found or limit is reached.
func readUntilHeadClose(r io.Reader) []byte {
	var buf bytes.Buffer
	chunk := make([]byte, chunkSize)

	for buf.Len() < maxHeadBytes {
		n, err := r.Read(chunk)
		if n > 0 {
			buf.Write(chunk[:n])
			// Check if we've seen </head> in accumulated bytes
			if idx := bytes.Index(bytes.ToLower(buf.Bytes()), []byte("</head>")); idx != -1 {
				return buf.Bytes()[:idx+len("</head>")]
			}
		}
		if err != nil {
			break
		}
	}

	return buf.Bytes()
}

// parseFaviconFromHTML extracts <link rel="icon"> href from raw HTML bytes.
func parseFaviconFromHTML(body []byte, baseURL *url.URL) string {
	tokenizer := html.NewTokenizer(bytes.NewReader(body))
	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			return ""
		case html.StartTagToken, html.SelfClosingTagToken:
			tn, hasAttr := tokenizer.TagName()
			if string(tn) == "link" && hasAttr {
				attrs := collectAttrs(tokenizer)
				rel := strings.ToLower(attrs["rel"])
				if rel == "icon" || rel == "shortcut icon" {
					if href := attrs["href"]; href != "" {
						return resolveURL(baseURL, href)
					}
				}
			}
		}
	}
}

// fetchAndStoreFavicon downloads a favicon and stores it in the database.
// It tries iconURL first (from <link rel="icon">), then falls back to /favicon.ico.
func (h *handler) fetchAndStoreFavicon(domain, baseOrigin, iconURL string) {
	// Check if we already have a fresh favicon
	var fetchedAt int64
	err := h.store.QueryRowContext(context.Background(),
		"SELECT fetched_at FROM favicon WHERE domain = ?", domain,
	).Scan(&fetchedAt)
	if err == nil && time.Since(time.Unix(fetchedAt, 0)) < faviconMaxAge {
		return
	}

	client := newHTTPClient()

	var tryURLs []string
	if iconURL != "" {
		tryURLs = append(tryURLs, iconURL)
	}
	tryURLs = append(tryURLs, baseOrigin+"/favicon.ico")

	for _, faviconURL := range tryURLs {
		req, err := newMetadataRequest(context.Background(), http.MethodGet, faviconURL)
		if err != nil {
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			continue
		}

		data, err := io.ReadAll(io.LimitReader(resp.Body, maxFaviconBytes))
		resp.Body.Close()
		if err != nil || len(data) == 0 {
			continue
		}

		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "image/x-icon"
		}

		_, err = h.store.ExecContext(context.Background(),
			`INSERT INTO favicon (domain, data, content_type, fetched_at) VALUES (?, ?, ?, unixepoch())
			 ON CONFLICT(domain) DO UPDATE SET data = excluded.data, content_type = excluded.content_type, fetched_at = excluded.fetched_at`,
			domain, data, contentType,
		)
		if err != nil {
			slog.Error("failed to store favicon", "domain", domain, "err", err)
		}
		return // success
	}
}

func (h *handler) getFavicon(w http.ResponseWriter, r *http.Request) {
	domain := r.PathValue("domain")
	if domain == "" {
		writeError(w, http.StatusBadRequest, "missing domain")
		return
	}

	var data []byte
	var contentType string
	err := h.store.QueryRowContext(r.Context(),
		"SELECT data, content_type FROM favicon WHERE domain = ?", domain,
	).Scan(&data, &contentType)
	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		serverError(w, "failed to query favicon", err)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}

func parseHTML(body io.Reader, baseURL *url.URL) MetadataResponse {
	var meta MetadataResponse

	tokenizer := html.NewTokenizer(body)

	var (
		inTitle  bool
		titleDone bool
		ogTitle  string
		ogDesc   string
		ogImage  string
		metaDesc string
	)

	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			goto done

		case html.StartTagToken, html.SelfClosingTagToken:
			tn, hasAttr := tokenizer.TagName()
			tagName := string(tn)

			if tagName == "body" {
				goto done
			}

			if tagName == "title" && tt == html.StartTagToken {
				inTitle = true
				continue
			}

			if tagName == "meta" && hasAttr {
				attrs := collectAttrs(tokenizer)
				name := strings.ToLower(attrs["name"])
				property := strings.ToLower(attrs["property"])
				content := attrs["content"]

				if property == "og:title" {
					ogTitle = content
				} else if property == "og:description" {
					ogDesc = content
				} else if property == "og:image" && ogImage == "" {
					ogImage = content
				} else if name == "description" && metaDesc == "" {
					metaDesc = content
				}
			}

			if tagName == "link" && hasAttr {
				attrs := collectAttrs(tokenizer)
				rel := strings.ToLower(attrs["rel"])
				if rel == "icon" || rel == "shortcut icon" {
					if href := attrs["href"]; href != "" {
						meta.Favicon = resolveURL(baseURL, href)
					}
				}
			}

		case html.EndTagToken:
			tn, _ := tokenizer.TagName()
			tagName := string(tn)

			if tagName == "head" {
				goto done
			}

			if tagName == "title" {
				inTitle = false
				titleDone = true
			}

		case html.TextToken:
			if inTitle && !titleDone {
				meta.Title = strings.TrimSpace(string(tokenizer.Text()))
			}
		}
	}

done:
	if ogTitle != "" {
		meta.Title = ogTitle
	}
	if ogDesc != "" {
		meta.Description = ogDesc
	} else if metaDesc != "" {
		meta.Description = metaDesc
	}

	if ogImage != "" && baseURL != nil {
		meta.PreviewImage = resolveURL(baseURL, ogImage)
	}

	if meta.Favicon == "" && baseURL != nil {
		meta.Favicon = resolveURL(baseURL, "/favicon.ico")
	}

	return meta
}

func collectAttrs(z *html.Tokenizer) map[string]string {
	attrs := make(map[string]string)
	for {
		key, val, more := z.TagAttr()
		attrs[string(key)] = string(val)
		if !more {
			break
		}
	}
	return attrs
}

func resolveURL(base *url.URL, ref string) string {
	parsed, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return base.ResolveReference(parsed).String()
}

// rejectPrivateHost resolves the hostname and rejects private/loopback IP ranges to prevent SSRF.
func rejectPrivateHost(hostname string) error {
	ips, err := net.LookupHost(hostname)
	if err != nil {
		return fmt.Errorf("cannot resolve hostname: %s", hostname)
	}
	for _, ipStr := range ips {
		ip := net.ParseIP(ipStr)
		if ip == nil {
			continue
		}
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return fmt.Errorf("requests to private/internal addresses are not allowed")
		}
	}
	return nil
}
