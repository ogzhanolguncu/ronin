package main

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"
	"net/url"
	"strings"

	"golang.org/x/net/html"
)

type MetadataResponse struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Favicon     string `json:"favicon"`
}

func (h *handler) getMetadata(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
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

	meta, err := fetchMetadata(r.Context(), rawURL)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch URL")
		return
	}

	writeJSON(w, http.StatusOK, meta)
}

func fetchMetadata(ctx context.Context, rawURL string) (*MetadataResponse, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Safha/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	parsed, _ := url.Parse(rawURL)

	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "text/html") {
		favicon := resolveURL(parsed, "/favicon.ico")
		return &MetadataResponse{URL: rawURL, Favicon: favicon}, nil
	}

	body := io.LimitReader(resp.Body, 5*1024*1024) // 5MB
	meta := parseHTML(body, parsed)
	meta.URL = rawURL
	return &meta, nil
}

func parseHTML(body io.Reader, baseURL *url.URL) MetadataResponse {
	var meta MetadataResponse

	tokenizer := html.NewTokenizer(body)

	var (
		inTitle   bool
		titleDone bool
		ogTitle   string
		ogDesc    string
		metaDesc  string
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

