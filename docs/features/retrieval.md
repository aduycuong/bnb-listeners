# Retrieval

Hybrid search over indexed chunks for MCP agents and the document-detail chunk search UI.

Implementation: `lib/retrieval/services/search-chunks.ts`

## Search sources

Each query runs three retrieval methods in parallel, then merges their ranked lists:

| Source | Index / column | Query embedding | Matches |
| --- | --- | --- | --- |
| Text vector | `chunks.embedding` (1536d, HNSW cosine) | OpenAI `text-embedding-3-small` | All chunks |
| Multimodal vector | `chunks.embedding_multimodal` (1024d, partial HNSW) | Voyage `voyage-multimodal-3.5` (`input_type: query`) | Image/video chunks with a multimodal vector |
| Full-text (FTS) | `chunks.content_tsv` | `websearch_to_tsquery('simple', …)` | Chunks whose text matches the query keywords |

Multimodal search is skipped when `VOYAGE_API_KEY` is missing or the Voyage request fails; text vector + FTS still run.

All sources filter to chunks with `quality_score >= 0.4` (`RETRIEVAL_QUALITY_MIN`). `chunks.quality_score` is the score of the **part** the chunk came from (see [Score](./score.md)), so a text chunk and an image chunk from the same post can rank differently.

## Reciprocal Rank Fusion (RRF)

**RRF** = **Reciprocal Rank Fusion**.

Instead of combining raw scores from different methods (which live on incompatible scales), RRF merges **ranks** from each source.

### Formula

For a chunk `d`, let `R(d)` be the set of ranks that chunk received across every source it appeared in (rank 1 = best match in that source):

```
RRF(d) = Σ  1 / (k + r)
         r∈R(d)
```

In this codebase:

- `k = 60` (`RRF_K` in `lib/retrieval/config.ts`) — standard smoothing constant; higher `k` makes rank falloff gentler
- `r` = 1-based rank within that source's candidate list

### Example

Chunk A appears in two sources:

- Text vector: rank 1 → `1 / (60 + 1) ≈ 0.01639`
- FTS: rank 3 → `1 / (60 + 3) ≈ 0.01587`

**RRF(A) ≈ 0.03226**

Chunk B appears only in text vector at rank 2:

- Text vector: rank 2 → `1 / (60 + 2) ≈ 0.01613`

**RRF(B) ≈ 0.01613**

Final results are sorted by **RRF descending**. A chunk that ranks well in multiple sources typically outranks a chunk that only appears in one.

### Candidate and return limits

| Constant | Value | Meaning |
| --- | --- | --- |
| `RETRIEVAL_CANDIDATE_LIMIT` | 20 | Max chunks fetched per source before fusion |
| `RETRIEVAL_RETURN_LIMIT` | 8 | Default number of chunks returned after fusion |
| `RRF_K` | 60 | RRF smoothing constant |

## Exposed scores

Per-method debug scores are **opt-in**. Pass `includeScores: true` to `searchChunks` (the document-detail chunk search UI does this). Production MCP `search_knowledge` leaves the flag off so the final SELECT does not detoast embedding columns or recompute cosine / `ts_rank` for returned rows.

When `includeScores` is true, the search API returns both **fusion rank** and **per-method debug scores**:

| Field | Meaning |
| --- | --- |
| `rrfScore` | Final RRF fusion score used for ordering |
| `similarityScore` | Text cosine similarity: `1 - (embedding <=> query_vector)` |
| `multimodalSimilarityScore` | Multimodal cosine similarity, or `null` for text-only / missing multimodal vector |
| `ftsScore` | PostgreSQL `ts_rank(content_tsv, query)` when the chunk matches FTS, otherwise `null` |
| `qualityScore` | Part score of the chunk's originating part (not query-specific) |

**Important:** text and multimodal vector search always return their nearest neighbours up to the candidate limit — there is no minimum similarity cutoff. A low `similarityScore` with a non-zero `rrfScore` usually means the chunk was the "least bad" match in a small pool, not a strong semantic hit. FTS only contributes when keywords match (`ftsScore` not null).

## Related docs

- [Serve](./serve.md) — product-facing retrieval behaviour
- [Score](./score.md) — quality gating (`RETRIEVAL_QUALITY_MIN`)
- [Chunk term sync](../ops/chunk-term-sync.md) — `term_ids` filter on chunks
