CREATE OR REPLACE FUNCTION sync_chunk_topics() RETURNS TRIGGER AS $$
BEGIN
    UPDATE chunks
    SET topic_slugs = (
        SELECT COALESCE(array_agg(t.slug), '{}')
        FROM document_topics dt
        JOIN topics t ON t.id = dt.topic_id
        WHERE dt.document_id = COALESCE(NEW.document_id, OLD.document_id)
    )
    WHERE document_id = COALESCE(NEW.document_id, OLD.document_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_chunk_topics
    AFTER INSERT OR UPDATE OR DELETE ON document_topics
    FOR EACH ROW EXECUTE FUNCTION sync_chunk_topics();
