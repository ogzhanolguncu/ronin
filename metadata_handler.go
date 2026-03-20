package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

const (
	maxHeadBytes = 5 * 1024 * 1024 // 5MB absolute limit
	chunkSize    = 50 * 1024       // 50KB read chunks
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
	meta, iconURL := parseHTML(bytes.NewReader(body), parsed)
	meta.URL = rawURL
	meta.Favicon = "/api/v1/favicons/" + domain

	go h.fetchAndStoreFavicon(domain, baseOrigin, iconURL)

	return &meta, nil
}

// readUntilHeadClose reads the response body in chunks and stops when </head> is found or limit is reached.
func readUntilHeadClose(r io.Reader) []byte {
	var buf bytes.Buffer
	chunk := make([]byte, chunkSize)
	closingTag := []byte("</head>")

	for buf.Len() < maxHeadBytes {
		n, err := r.Read(chunk)
		if n > 0 {
			buf.Write(chunk[:n])
			searchFrom := max(0, buf.Len()-n-len(closingTag)+1)
			if idx := bytes.Index(bytes.ToLower(buf.Bytes()[searchFrom:]), closingTag); idx != -1 {
				return buf.Bytes()[:searchFrom+idx+len(closingTag)]
			}
		}
		if err != nil {
			break
		}
	}

	return buf.Bytes()
}

func parseHTML(body io.Reader, baseURL *url.URL) (MetadataResponse, string) {
	var meta MetadataResponse
	doc, err := goquery.NewDocumentFromReader(body)
	if err != nil {
		return meta, ""
	}

	ogTitle, _ := doc.Find(`meta[property="og:title"]`).Attr("content")
	ogDesc, _ := doc.Find(`meta[property="og:description"]`).Attr("content")
	ogImage, _ := doc.Find(`meta[property="og:image"]`).First().Attr("content")
	metaDesc, _ := doc.Find(`meta[name="description"]`).First().Attr("content")
	titleText := strings.TrimSpace(doc.Find("title").First().Text())

	var iconHref string
	doc.Find(`link[rel="icon"], link[rel="shortcut icon"]`).EachWithBreak(func(_ int, s *goquery.Selection) bool {
		if href, exists := s.Attr("href"); exists && href != "" {
			iconHref = resolveURL(baseURL, href)
			return false
		}
		return true
	})

	if ogTitle != "" {
		meta.Title = ogTitle
	} else {
		meta.Title = titleText
	}
	if ogDesc != "" {
		meta.Description = ogDesc
	} else {
		meta.Description = metaDesc
	}
	if ogImage != "" && baseURL != nil {
		meta.PreviewImage = resolveURL(baseURL, ogImage)
	}

	return meta, iconHref
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
