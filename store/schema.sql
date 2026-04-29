CREATE TABLE IF NOT EXISTS collection (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL CHECK(length(name) >= 1 AND length(name) <= 50),
    slug       TEXT    NOT NULL UNIQUE CHECK(length(slug) >= 1 AND length(slug) <= 64),
    color_id   INTEGER NOT NULL DEFAULT 1 CHECK(color_id >= 1 AND color_id <= 10),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bookmark (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    url             TEXT NOT NULL UNIQUE CHECK(length(url) >= 1   AND length(url) <= 2048),
    title           TEXT NOT NULL        CHECK(length(title) >= 1 AND length(title) <= 512),
    description     TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 1024),
    notes           TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 8192),
    archived        INTEGER NOT NULL DEFAULT 0,
    read            INTEGER NOT NULL DEFAULT 0,
    favorite        INTEGER NOT NULL DEFAULT 0,
    collection_id   INTEGER REFERENCES collection(id) ON DELETE SET NULL,
    tags            TEXT    NOT NULL DEFAULT '',
    snapshot_status TEXT    NOT NULL DEFAULT '',
    readable_status TEXT    NOT NULL DEFAULT '',
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tag (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE CHECK(length(name) >= 1 AND length(name) <= 64),
    count      INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bookmark_tag (
    bookmark_id INTEGER NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, tag_id)
);

CREATE TABLE IF NOT EXISTS session (
    token      TEXT    PRIMARY KEY,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS favicon (
    domain       TEXT PRIMARY KEY,
    data         BLOB NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'image/x-icon',
    fetched_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS highlight (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bookmark_id  INTEGER NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE,
    text         TEXT    NOT NULL CHECK(length(text) >= 1 AND length(text) <= 4096),
    note         TEXT    NOT NULL DEFAULT '' CHECK(length(note) <= 4096),
    color        TEXT    NOT NULL DEFAULT 'yellow' CHECK(color IN ('yellow','green','blue','pink')),
    start_path   TEXT    NOT NULL,
    start_offset INTEGER NOT NULL,
    end_path     TEXT    NOT NULL,
    end_offset   INTEGER NOT NULL,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_bookmark_archived ON bookmark(archived);
CREATE INDEX IF NOT EXISTS idx_bookmark_read ON bookmark(read);
CREATE INDEX IF NOT EXISTS idx_bookmark_favorite ON bookmark(favorite);
CREATE INDEX IF NOT EXISTS idx_bookmark_archived_read_id ON bookmark(archived, read, id);
CREATE INDEX IF NOT EXISTS idx_bookmark_tag_tag_id ON bookmark_tag(tag_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_collection_id ON bookmark(collection_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session(expires_at);
CREATE INDEX IF NOT EXISTS idx_highlight_bookmark_id ON highlight(bookmark_id);

CREATE TRIGGER IF NOT EXISTS bookmark_updated_at
AFTER UPDATE ON bookmark
BEGIN
    UPDATE bookmark SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tag_updated_at
AFTER UPDATE ON tag
BEGIN
    UPDATE tag SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS collection_updated_at
AFTER UPDATE ON collection
BEGIN
    UPDATE collection SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS inc_tag_count AFTER INSERT ON bookmark_tag
BEGIN
    UPDATE tag SET count = count + 1 WHERE id = NEW.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS dec_tag_count AFTER DELETE ON bookmark_tag
BEGIN
    UPDATE tag SET count = count - 1 WHERE id = OLD.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_bookmark_tags_insert
AFTER INSERT ON bookmark_tag
BEGIN
    UPDATE bookmark SET tags = COALESCE(
        (SELECT GROUP_CONCAT(t.name, ' ')
         FROM bookmark_tag bt
         JOIN tag t ON t.id = bt.tag_id
         WHERE bt.bookmark_id = NEW.bookmark_id),
        ''
    ) WHERE id = NEW.bookmark_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_bookmark_tags_delete
AFTER DELETE ON bookmark_tag
BEGIN
    UPDATE bookmark SET tags = COALESCE(
        (SELECT GROUP_CONCAT(t.name, ' ')
         FROM bookmark_tag bt
         JOIN tag t ON t.id = bt.tag_id
         WHERE bt.bookmark_id = OLD.bookmark_id),
        ''
    ) WHERE id = OLD.bookmark_id;
END;
