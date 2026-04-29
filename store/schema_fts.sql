CREATE VIRTUAL TABLE IF NOT EXISTS bookmark_fts USING fts5(
    title, description, notes, url, tags
);

CREATE TRIGGER IF NOT EXISTS bookmark_fts_insert
AFTER INSERT ON bookmark
BEGIN
    INSERT INTO bookmark_fts(rowid, title, description, notes, url, tags)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.notes, NEW.url, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS bookmark_fts_update
AFTER UPDATE ON bookmark
BEGIN
    DELETE FROM bookmark_fts WHERE rowid = OLD.id;
    INSERT INTO bookmark_fts(rowid, title, description, notes, url, tags)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.notes, NEW.url, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS bookmark_fts_delete
AFTER DELETE ON bookmark
BEGIN
    DELETE FROM bookmark_fts WHERE rowid = OLD.id;
END;
