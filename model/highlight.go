package model

type Highlight struct {
	ID          int64  `db:"id"           json:"id"`
	BookmarkID  int64  `db:"bookmark_id"  json:"bookmark_id"`
	Text        string `db:"text"         json:"text"`
	Note        string `db:"note"         json:"note"`
	Color       string `db:"color"        json:"color"`
	StartPath   string `db:"start_path"   json:"start_path"`
	StartOffset int    `db:"start_offset" json:"start_offset"`
	EndPath     string `db:"end_path"     json:"end_path"`
	EndOffset   int    `db:"end_offset"   json:"end_offset"`
	CreatedAt   uint64 `db:"created_at"   json:"created_at"`
	UpdatedAt   uint64 `db:"updated_at"   json:"updated_at"`
}

type CreateHighlightRequest struct {
	Text        string `json:"text"`
	Note        string `json:"note"`
	Color       string `json:"color"`
	StartPath   string `json:"start_path"`
	StartOffset int    `json:"start_offset"`
	EndPath     string `json:"end_path"`
	EndOffset   int    `json:"end_offset"`
}

type UpdateHighlightRequest struct {
	Note  string `json:"note"`
	Color string `json:"color"`
}

type HighlightsResponse struct {
	Highlights []Highlight `json:"highlights"`
}
