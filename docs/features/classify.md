# Classify

Assign each collected item to one or more terms using an LLM classifier.

## Terms

Admin maintains the term list. Term names are unique within a workspace. Terms are the only classification dimension — industry, news group, and entity distinctions are expressed as terms.

When the classifier cannot match an item to any existing term, it auto-creates a new term and assigns the document immediately. LLM-created terms are usable right away for classification and retrieval — no approval gate.

Workspace settings control the **term scope** (what the domain covers) and **generated term language** (Vietnamese, English, or Auto — match the document). LLM system prompts for classification, term proposals, and relevance scoring are built from these settings.

## Classification flow

1. After scoring, an LLM classifier reads each item and selects matching terms by id from the full term list (including LLM-created terms).
2. If one or more terms match, the item is assigned immediately with a confidence score.
3. If no term matches, the LLM proposes a new term (name + description). If that name already exists in the workspace, the existing term is assigned; otherwise a new term is created and assigned.

## Admin review

- Review LLM-created terms in the terms list (look for the **Classifier** badge).
- **Merge / rename** — combine duplicates or improve naming as needed.

Each auto-created term records `source_document_id` — the document that triggered its creation — for review context.

## Classification confidence

Each term assignment carries a confidence score from the LLM (0.0–1.0). Low-confidence assignments are visible to admin for optional review. Auto-created term assignments use confidence 1.0.
