package urlutil

import "testing"

func TestNormalize(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{"empty", "", "", true},
		{"spaces only", "   ", "", true},

		// Scheme + host casing
		{"lowercase scheme", "HTTPS://example.com", "https://example.com", false},
		{"lowercase host", "https://EXAMPLE.COM", "https://example.com", false},
		{"mixed case", "HTTP://Www.Example.COM/Path", "https://example.com/Path", false},

		// HTTP upgraded to HTTPS
		{"http to https", "http://example.com/page", "https://example.com/page", false},

		// Default ports
		{"strip https 443", "https://example.com:443/path", "https://example.com/path", false},
		{"strip http 80", "http://example.com:80/path", "https://example.com/path", false},
		{"keep non-default port", "https://example.com:8080/path", "https://example.com:8080/path", false},

		// www stripping
		{"strip www", "https://www.example.com", "https://example.com", false},
		{"strip www with path", "https://www.example.com/page", "https://example.com/page", false},
		{"dont strip www from middle", "https://notwww.example.com", "https://notwww.example.com", false},

		// Fragments
		{"remove fragment", "https://example.com#section", "https://example.com", false},
		{"remove fragment with path", "https://example.com/page#top", "https://example.com/page", false},

		// Trailing slash
		{"strip trailing slash", "https://example.com/", "https://example.com", false},
		{"strip trailing slash on path", "https://example.com/blog/", "https://example.com/blog", false},
		{"root path stays clean", "https://example.com", "https://example.com", false},

		// Tracking params
		{"remove utm_source", "https://example.com?utm_source=twitter", "https://example.com", false},
		{"remove multiple tracking", "https://example.com?utm_source=twitter&fbclid=abc&q=hello", "https://example.com?q=hello", false},
		{"remove all tracking leaves no query", "https://example.com?utm_medium=email&gclid=123", "https://example.com", false},
		{"case insensitive tracking param", "https://example.com?UTM_SOURCE=twitter", "https://example.com", false},

		// Query param sorting
		{"sort params", "https://example.com?b=2&a=1", "https://example.com?a=1&b=2", false},
		{"sort params with tracking removed", "https://example.com?z=1&a=2&utm_source=x", "https://example.com?a=2&z=1", false},

		// Dot segments (stdlib handles this)
		{"resolve dot segments", "https://example.com/a/../b", "https://example.com/b", false},

		// Combined
		{"full normalization", "HTTPS://WWW.EXAMPLE.COM:443/blog/?utm_source=twitter&q=test#section", "https://example.com/blog?q=test", false},

		// Non-HTTP schemes (no upgrade, minimal normalization)
		{"ftp passthrough", "ftp://FILES.Example.COM/path/", "ftp://files.example.com/path/", false},
		{"file passthrough", "file:///tmp/test", "file:///tmp/test", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Normalize(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Normalize(%q) error = %v, wantErr = %v", tt.input, err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("Normalize(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
