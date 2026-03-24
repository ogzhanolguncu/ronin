package handler

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ogzhanolguncu/ronin/model"
	"github.com/ogzhanolguncu/ronin/store"
	gocache "github.com/patrickmn/go-cache"
)

func doRequest(t *testing.T, srv *httptest.Server, method, path string, body any) *http.Response {
	t.Helper()
	var reqBody *bytes.Buffer
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		reqBody = bytes.NewBuffer(b)
	} else {
		reqBody = &bytes.Buffer{}
	}

	req, err := http.NewRequest(method, srv.URL+path, reqBody)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	return resp
}

func TestBookmarkHandlers(t *testing.T) {
	s, err := store.NewStore(":memory:")
	if err != nil {
		t.Fatalf("create store: %v", err)
	}
	defer s.Close()

	h := &Handler{
		store:           s,
		devMode:         true,
		distFS:          embed.FS{},
		metadataCache:   gocache.New(gocache.NoExpiration, 0),
		tagCache:        gocache.New(gocache.NoExpiration, 0),
		collectionCache: gocache.New(gocache.NoExpiration, 0),
		sessionCache:    gocache.New(gocache.NoExpiration, 0),
	}
	srv := httptest.NewServer(newRouter(h))
	defer srv.Close()

	var createdID int64

	t.Run("CreateBookmark", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPost, "/api/v1/bookmarks", model.CreateBookmarkRequest{
			URL:         "https://example.com",
			Title:       "Example",
			Description: "An example site",
			Notes:       "some notes",
			Tags:        "go test",
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected 201, got %d", resp.StatusCode)
		}

		var bm model.Bookmark
		if err := json.NewDecoder(resp.Body).Decode(&bm); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if bm.ID == 0 {
			t.Fatal("expected non-zero id")
		}
		createdID = bm.ID
	})

	t.Run("CreateBookmark_DuplicateURL", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPost, "/api/v1/bookmarks", model.CreateBookmarkRequest{
			URL:   "https://example.com",
			Title: "Duplicate",
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusConflict {
			t.Fatalf("expected 409, got %d", resp.StatusCode)
		}
	})

	t.Run("CreateBookmark_MissingURL", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPost, "/api/v1/bookmarks", model.CreateBookmarkRequest{
			Title: "No URL",
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("expected 422, got %d", resp.StatusCode)
		}
	})

	t.Run("GetBookmark", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodGet, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), nil)
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.StatusCode)
		}

		var bm model.Bookmark
		if err := json.NewDecoder(resp.Body).Decode(&bm); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if bm.URL != "https://example.com" {
			t.Fatalf("expected URL https://example.com, got %s", bm.URL)
		}
		if bm.Title != "Example" {
			t.Fatalf("expected title Example, got %s", bm.Title)
		}
		if len(bm.ParsedTags) != 2 {
			t.Fatalf("expected 2 tags, got %d: %v", len(bm.ParsedTags), bm.ParsedTags)
		}
	})

	t.Run("GetBookmark_NotFound", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodGet, "/api/v1/bookmarks/999", nil)
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", resp.StatusCode)
		}
	})

	t.Run("ListBookmarks", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodGet, "/api/v1/bookmarks", nil)
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.StatusCode)
		}

		var list model.ListBookmarksResponse
		if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if len(list.Bookmarks) != 1 {
			t.Fatalf("expected 1 bookmark, got %d", len(list.Bookmarks))
		}
	})

	t.Run("ListBookmarks_Pagination", func(t *testing.T) {
		// Create a second bookmark so we have 2 total
		createResp := doRequest(t, srv, http.MethodPost, "/api/v1/bookmarks", model.CreateBookmarkRequest{
			URL:   "https://example2.com",
			Title: "Example 2",
			Tags:  "pagination",
		})
		var created model.Bookmark
		json.NewDecoder(createResp.Body).Decode(&created)
		createResp.Body.Close()
		paginationID := created.ID

		resp := doRequest(t, srv, http.MethodGet, "/api/v1/bookmarks?limit=1", nil)
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.StatusCode)
		}

		var list model.ListBookmarksResponse
		if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if len(list.Bookmarks) != 1 {
			t.Fatalf("expected 1 bookmark, got %d", len(list.Bookmarks))
		}
		if list.Meta.TotalCount < 2 {
			t.Fatalf("expected total_count >= 2, got %d", list.Meta.TotalCount)
		}
		if list.Meta.TotalPages < 2 {
			t.Fatalf("expected total_pages >= 2, got %d", list.Meta.TotalPages)
		}

		// Clean up: delete the second bookmark
		doRequest(t, srv, http.MethodDelete, fmt.Sprintf("/api/v1/bookmarks/%d", paginationID), nil).Body.Close()
	})

	t.Run("UpdateBookmark", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPut, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), model.UpdateBookmarkRequest{
			URL:         "https://example.com/updated",
			Title:       "Updated Example",
			Description: "Updated description",
			Notes:       "updated notes",
			Tags:        "updated",
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", resp.StatusCode)
		}

		// Verify via GET
		getResp := doRequest(t, srv, http.MethodGet, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), nil)
		defer getResp.Body.Close()

		var bm model.Bookmark
		if err := json.NewDecoder(getResp.Body).Decode(&bm); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if bm.Title != "Updated Example" {
			t.Fatalf("expected title Updated Example, got %s", bm.Title)
		}
		if bm.URL != "https://example.com/updated" {
			t.Fatalf("expected URL https://example.com/updated, got %s", bm.URL)
		}
		if len(bm.ParsedTags) != 1 || bm.ParsedTags[0] != "updated" {
			t.Fatalf("expected tags [updated], got %v", bm.ParsedTags)
		}
	})

	t.Run("UpdateBookmark_NotFound", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPut, "/api/v1/bookmarks/9999", model.UpdateBookmarkRequest{
			URL:   "https://nonexistent.com",
			Title: "Nonexistent",
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", resp.StatusCode)
		}
	})

	t.Run("ArchiveBookmarks", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPatch, "/api/v1/bookmarks/archive", model.ArchiveBookmarkRequest{
			IDs: []model.ArchiveEntry{{ID: createdID, Archived: true}},
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", resp.StatusCode)
		}

		// Verify via GET
		getResp := doRequest(t, srv, http.MethodGet, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), nil)
		defer getResp.Body.Close()

		var bm model.Bookmark
		json.NewDecoder(getResp.Body).Decode(&bm)
		if !bm.Archived {
			t.Fatal("expected bookmark to be archived")
		}
	})

	t.Run("ReadBookmarks", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPatch, "/api/v1/bookmarks/read", model.ReadBookmarkRequest{
			IDs: []model.ReadEntry{{ID: createdID, Read: true}},
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", resp.StatusCode)
		}

		// Verify via GET
		getResp := doRequest(t, srv, http.MethodGet, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), nil)
		defer getResp.Body.Close()

		var bm model.Bookmark
		json.NewDecoder(getResp.Body).Decode(&bm)
		if !bm.Read {
			t.Fatal("expected bookmark to be read")
		}
	})

	var secondID int64

	t.Run("CreateSecondBookmark", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodPost, "/api/v1/bookmarks", model.CreateBookmarkRequest{
			URL:   "https://second.com",
			Title: "Second",
			Tags:  "second",
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected 201, got %d", resp.StatusCode)
		}

		var bm model.Bookmark
		json.NewDecoder(resp.Body).Decode(&bm)
		secondID = bm.ID
	})

	t.Run("DeleteBookmark", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodDelete, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), nil)
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", resp.StatusCode)
		}

		// Verify 404 on GET
		getResp := doRequest(t, srv, http.MethodGet, fmt.Sprintf("/api/v1/bookmarks/%d", createdID), nil)
		defer getResp.Body.Close()

		if getResp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 after delete, got %d", getResp.StatusCode)
		}
	})

	t.Run("DeleteBookmarks", func(t *testing.T) {
		resp := doRequest(t, srv, http.MethodDelete, "/api/v1/bookmarks", model.DeleteBookmarkRequest{
			IDs: []int{int(secondID)},
		})
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", resp.StatusCode)
		}

		// Verify empty list
		listResp := doRequest(t, srv, http.MethodGet, "/api/v1/bookmarks", nil)
		defer listResp.Body.Close()

		var list model.ListBookmarksResponse
		json.NewDecoder(listResp.Body).Decode(&list)
		if len(list.Bookmarks) != 0 {
			t.Fatalf("expected 0 bookmarks, got %d", len(list.Bookmarks))
		}
	})
}
