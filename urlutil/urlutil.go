package urlutil

import (
	"errors"
	"net/url"
	"path"
	"sort"
	"strings"
)

var trackingParams = map[string]bool{
	"utm_source":   true,
	"utm_medium":   true,
	"utm_campaign": true,
	"utm_term":     true,
	"utm_content":  true,
	"utm_id":       true,
	"fbclid":       true,
	"gclid":        true,
	"dclid":        true,
	"msclkid":      true,
	"mc_cid":       true,
	"mc_eid":       true,
	"_ga":          true,
	"_gl":          true,
}

// Normalize canonicalizes a URL for deduplication. The returned URL is
// still valid and navigable. Only http/https URLs get the full treatment;
// other schemes are lowercased but otherwise untouched.
func Normalize(rawURL string) (string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return "", errors.New("empty URL")
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	u.Scheme = strings.ToLower(u.Scheme)
	u.Host = strings.ToLower(u.Host)

	// Upgrade http to https
	if u.Scheme == "http" {
		u.Scheme = "https"
	}

	if u.Scheme != "https" {
		return u.String(), nil
	}

	// Remove default ports (80 and 443 are both stripped since http is upgraded to https)
	host := u.Hostname()
	port := u.Port()
	if port == "80" || port == "443" {
		port = ""
	}
	if port != "" {
		u.Host = host + ":" + port
	} else {
		u.Host = host
	}

	// Strip www.
	u.Host = strings.TrimPrefix(u.Host, "www.")

	// Remove fragment
	u.Fragment = ""
	u.RawFragment = ""

	// Resolve dot segments and strip trailing slash
	if u.Path != "" {
		u.Path = path.Clean(u.Path)
	}
	u.Path = strings.TrimRight(u.Path, "/")

	// Remove tracking params and sort remaining
	if u.RawQuery != "" {
		params := u.Query()
		for key := range params {
			if trackingParams[strings.ToLower(key)] {
				delete(params, key)
			}
		}
		if len(params) == 0 {
			u.RawQuery = ""
		} else {
			keys := make([]string, 0, len(params))
			for k := range params {
				keys = append(keys, k)
			}
			sort.Strings(keys)

			var buf strings.Builder
			for i, k := range keys {
				vals := params[k]
				sort.Strings(vals)
				for j, v := range vals {
					if i > 0 || j > 0 {
						buf.WriteByte('&')
					}
					buf.WriteString(url.QueryEscape(k))
					buf.WriteByte('=')
					buf.WriteString(url.QueryEscape(v))
				}
			}
			u.RawQuery = buf.String()
		}
	}

	return u.String(), nil
}
