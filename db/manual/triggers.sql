CREATE OR REPLACE FUNCTION sync_chunk_topics() RETURNS TRIGGER AS $$
BEGIN
    UPDATE chunks
    SET topic_ids = (
        SELECT COALESCE(array_agg(dt.topic_id), '{}')
        FROM document_topics dt
        WHERE dt.document_id = COALESCE(NEW.document_id, OLD.document_id)
    )
    WHERE document_id = COALESCE(NEW.document_id, OLD.document_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_chunk_topics ON document_topics;

CREATE TRIGGER trg_sync_chunk_topics
    AFTER INSERT OR UPDATE OR DELETE ON document_topics
    FOR EACH ROW EXECUTE FUNCTION sync_chunk_topics();

-- Keeps chunks.{like,comment,share,view}_count in step with the document.
-- Engagement counters are refreshed on every scrape, so mirroring them here
-- lets retrieval filter and sort on popularity without re-embedding anything.
CREATE OR REPLACE FUNCTION sync_chunk_engagement() RETURNS TRIGGER AS $$
BEGIN
    UPDATE chunks
    SET like_count    = NEW.like_count,
        comment_count = NEW.comment_count,
        share_count   = NEW.share_count,
        view_count    = NEW.view_count
    WHERE document_id = NEW.id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_chunk_engagement ON documents;

CREATE TRIGGER trg_sync_chunk_engagement
    AFTER UPDATE OF like_count, comment_count, share_count, view_count ON documents
    FOR EACH ROW
    WHEN (
        OLD.like_count    IS DISTINCT FROM NEW.like_count
        OR OLD.comment_count IS DISTINCT FROM NEW.comment_count
        OR OLD.share_count   IS DISTINCT FROM NEW.share_count
        OR OLD.view_count    IS DISTINCT FROM NEW.view_count
    )
    EXECUTE FUNCTION sync_chunk_engagement();
