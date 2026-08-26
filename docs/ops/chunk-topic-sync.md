# Chunk Topic Sync — Operational Notes

`chunks.topic_ids` is a denormalized copy of a document's topic assignments. It is kept in sync automatically by the `trg_sync_chunk_topics` trigger, which fires after every INSERT, UPDATE, or DELETE on `document_topics`. New chunks also copy the current assignments at insert time.

## Why it exists

Filtering chunks by topic during RAG retrieval needs to be fast. Joining `chunks → document_topics` on every query adds latency. Storing `topic_ids UUID[]` directly on each chunk lets the query filter with a single GIN index lookup:

```sql
WHERE ch.topic_ids && ARRAY['11111111-1111-1111-1111-111111111111']::uuid[]
```

## Normal operation

For regular ingestion (one document at a time), the trigger is safe. Each firing updates only the chunks belonging to that one document (~5–20 rows), and `idx_chunks_document_id` makes the lookup fast.

Classification usually runs before chunks exist. `storeChunks` therefore copies current `document_topics` into `topic_ids` on insert. Later assignment changes still go through the trigger.

## Risk: bulk operations on `document_topics`

**Do not** insert, update, or delete large numbers of `document_topics` rows while the trigger is enabled. The trigger is `FOR EACH ROW`, so it fires once per row changed. On a bulk re-classification of millions of documents this produces:

- Millions of individual UPDATE statements on `chunks`
- Millions of GIN index (`idx_chunks_topic_ids`) updates
- Lock contention if multiple workers run in parallel
- Risk of I/O saturation and query timeouts on the live database

Situations that trigger this risk:

- Running the LLM classifier again after adding or restructuring topics
- Migrating topic taxonomy (e.g. splitting or merging topics)
- Backfilling topic assignments from an external source

## Safe pattern for bulk operations

1. **Disable the trigger** before the bulk operation.
2. **Run the bulk change** on `document_topics`.
3. **Re-sync in batches**, processing one document at a time or in small groups to avoid long transactions.
4. **Re-enable the trigger**.

```sql
-- Step 1
ALTER TABLE document_topics DISABLE TRIGGER trg_sync_chunk_topics;

-- Step 2
-- (run your bulk INSERT / UPDATE / DELETE on document_topics here)

-- Step 3 — re-sync only the affected documents, in batches
UPDATE chunks c
SET topic_ids = (
    SELECT COALESCE(array_agg(dt.topic_id), '{}')
    FROM document_topics dt
    WHERE dt.document_id = c.document_id
)
WHERE c.document_id IN (
    SELECT DISTINCT document_id FROM document_topics
    WHERE assigned_at > now() - interval '1 hour'  -- adjust to match your bulk job window
);

-- Step 4
ALTER TABLE document_topics ENABLE TRIGGER trg_sync_chunk_topics;
```

For very large backlogs, process in smaller batches (e.g. 10 000 documents at a time) and commit between batches to keep transaction size manageable.

## After migrating off `topic_slugs`

Re-apply `db/manual/triggers.sql`, then backfill existing chunks:

```sql
UPDATE chunks c
SET topic_ids = (
    SELECT COALESCE(array_agg(dt.topic_id), '{}')
    FROM document_topics dt
    WHERE dt.document_id = c.document_id
);
```

## Alternative: async queue

If bulk re-classification is a recurring need, replace the synchronous trigger with an async pattern:

1. The trigger (or application code) writes `document_id` into a `chunk_topic_sync_queue` table.
2. A background worker reads the queue in batches and runs the UPDATE on `chunks`.
3. This decouples ingestion throughput from sync latency and avoids lock contention.

The trade-off is a short window where `chunks.topic_ids` may be stale. For most RAG use cases this is acceptable.
