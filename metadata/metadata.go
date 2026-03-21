package metadata

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
	MaxHeadBytes = 5 * 1024 * 1024 // 5MB absolute limit
	ChunkSize    = 50 * 1024       // 50KB read chunks
)

var DefaultHeaders = map[string]string{
	"User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.9",
	"DNT":             "1",
}

type Response struct {
	URL          string `json:"url"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Favicon      string `json:"favicon"`
	PreviewImage string `json:"preview_image,omitempty"`
}

func NewRequest(ctx context.Context, method, rawURL string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, rawURL, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range DefaultHeaders {
		req.Header.Set(k, v)
	}
	return req, nil
}

func NewHTTPClient() *http.Client {
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

// ReadUntilHeadClose reads the response body in chunks and stops when </head> is found or limit is reached.
func ReadUntilHeadClose(r io.Reader) []byte {
	var buf bytes.Buffer
	chunk := make([]byte, ChunkSize)
	closingTag := []byte("</head>")

	for buf.Len() < MaxHeadBytes {
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

func ParseHTML(body io.Reader, baseURL *url.URL) (Response, string) {
	var meta Response
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
			iconHref = ResolveURL(baseURL, href)
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
		meta.PreviewImage = ResolveURL(baseURL, ogImage)
	}

	return meta, iconHref
}

func ResolveURL(base *url.URL, ref string) string {
	parsed, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return base.ResolveReference(parsed).String()
}

// RejectPrivateHost resolves the hostname and rejects private/loopback IP ranges to prevent SSRF.
func RejectPrivateHost(hostname string) error {
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
