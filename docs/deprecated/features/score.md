# Score

Rate each collected item for quality so research uses clean, relevant content — not noise or low-value posts.

## Parts, not documents

A document is split into **parts** before scoring: one part for the text body and one part for every image and video attached to it. Each part is scored **independently** and only parts that pass are classified and indexed — so a strong infographic on a thin post still enters the index, and a decorative photo on a strong post does not.

Media parts are downloaded and archived on R2 first (`lib/media-assets`). Scraped CDN URLs expire within hours; the archived copy is what the vision model, the multimodal embedder, and the UI read.

## Two LLM scores per part

Every part receives two scores from an LLM, each 0–10 and normalised to 0–1:

| Score | Question it answers |
| ----- | ------------------- |
| `relevance` | How closely does this part relate to the workspace's data-collection scope? |
| `detail` | How much concrete, usable information does this part carry **on its own**? |

The LLM also returns a short `summary` of the information the part contains. For media parts the summary becomes the chunk text, so what gets embedded describes what is actually in the image.

- **Text parts** are scored by `TEXT_SCORING_MODEL` from title + body.
- **Image parts** are scored by `VISION_SCORING_MODEL` from the image alone — no caption, no post text. An image that only makes sense next to its caption must score low on detail; only images that carry retrievable information themselves (price lists, floor plans, infographics, screenshots of notices, …) pass.
- **Video parts** are a placeholder for now: they always score 0/0 (`score_source = placeholder`) and are never indexed.

There are no rule-based dimensions any more (freshness, completeness, source credibility were removed). Recency is handled by term digests and retrieval ordering, not by excluding content from the index.

## Eligibility and thresholds

A part is **eligible** when `relevance ≥ PART_RELEVANCE_MIN` **and** `detail ≥ PART_DETAIL_MIN` (both `0.5`, `lib/scoring/config.ts`). One strong score cannot compensate for a weak one.

- `part_score = (relevance + detail) / 2` — stored on the part and copied to every chunk built from it (`chunks.quality_score`).
- `documents.quality_score = max(part_score)` over eligible parts, `0` when none is eligible.

Parts whose media download or LLM call failed are stored as `score_source = failed` with the reason in `score_error`; they are ineligible but do not stop the rest of the document.

## Pipeline

`process-document` (QStash) runs on every new or changed document:

1. Delete the document's existing chunks — nothing stale survives a re-run.
2. Rebuild parts, archive media, score every part.
3. No eligible part → `embedding_status = rejected`, stop. No classification, no chunks.
4. Classify — the LLM sees only the eligible parts (text body + media summaries).
5. Chunk and embed the eligible parts; `embedding_status = chunked`.

Manual actions on the document page follow the same rules: **Re-score quality** rebuilds and re-scores parts (LLM cost), **Rebuild search index** re-chunks from the stored scores without calling the LLM, and **Re-classify terms** uses the current eligible parts.

## Quality-gated retrieval

Retrieval filters on `chunks.quality_score >= RETRIEVAL_QUALITY_MIN` (`lib/retrieval/config.ts`). Because a chunk only exists when its part passed both thresholds, this is a secondary guard; the primary gate is eligibility at index time.

## Repetition is signal, not noise

The same complaint or story often appears across many accounts. Copies are kept rather than collapsed: on a listening product, how many people repeat something is itself the measurement.

## Quality-aware trends

"Hot this month / this year" is based on volume, recency, and quality together (`avg_quality_score` in term digests uses `documents.quality_score`). A cluster of low-quality social posts should not outrank a smaller set of strong industry articles.
