package model

type Collection struct {
	ID        int64  `db:"id"         json:"id"`
	Name      string `db:"name"       json:"name"`
	Slug      string `db:"slug"       json:"slug"`
	ColorID   int    `db:"color_id"   json:"color_id"`
	CreatedAt uint64 `db:"created_at" json:"created_at"`
	UpdatedAt uint64 `db:"updated_at" json:"updated_at"`
}

type CreateCollectionRequest struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	ColorID int    `json:"color_id"`
}

type UpdateCollectionRequest struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	ColorID int    `json:"color_id"`
}

type CollectionsResponse struct {
	Collections []Collection `json:"collections"`
}
