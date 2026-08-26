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
