package main

type Tag struct {
	ID        int64  `db:"id"         json:"id"`
	Name      string `db:"name"       json:"name"`
	CreatedAt uint64 `db:"created_at" json:"created_at"`
	UpdatedAt uint64 `db:"updated_at" json:"updated_at"`
}
