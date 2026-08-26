# Classify

Assign each collected item to one or more topics using an LLM classifier.

## Topics

Admin maintains the topic list. Topic names are unique within a workspace. Topics are the only classification dimension — industry, news group, and entity distinctions are expressed as topics.

When the classifier cannot match an item to any existing topic, it auto-creates a new topic and assigns the document immediately. LLM-created topics are usable right away for classification and retrieval — no approval gate.

Workspace settings control the **topic scope** (what the domain covers) and **generated topic language** (Vietnamese, English, or Auto — match the document). LLM system prompts for classification, topic proposals, and relevance scoring are built from these settings.

Admin reviews topics via a `verified` flag: mark `verified = true` once a topic has been reviewed (rename, merge, or confirm as-is).

## Classification flow

1. After scoring, an LLM classifier reads each item and selects matching topics by id from the full topic list (including unverified LLM-created topics).
2. If one or more topics match, the item is assigned immediately with a confidence score.
3. If no topic matches, the LLM proposes a new topic (name + description). If that name already exists in the workspace, the existing topic is assigned; otherwise a new topic is created (`verified = false`) and assigned.

## Admin review

- Filter topics where `verified = false` to see LLM-created topics awaiting review.
- **Verify** — set `verified = true` after confirming the topic is acceptable.
- **Merge / rename** — combine duplicates or improve naming; then verify.

Each auto-created topic records `source_document_id` — the document that triggered its creation — for review context.

## Classification confidence

Each topic assignment carries a confidence score from the LLM (0.0–1.0). Low-confidence assignments are visible to admin for optional review. Auto-created topic assignments use confidence 1.0.
