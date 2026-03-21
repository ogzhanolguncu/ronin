package model

type Tag struct {
	Name  string `db:"name" json:"name"`
	Count int    `db:"count" json:"count"`
}

type TagsResponse struct {
	Tags []Tag `json:"tags"`
}
