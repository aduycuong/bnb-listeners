/**
 * Default LLM model for document term classification.
 * Must be a key in chatModelRegistry (lib/langchain).
 */
export const DEFAULT_CLASSIFIER_MODEL = "gpt-4.1" as const;

/** Max characters of document content sent to the classifier. */
export const CLASSIFIER_CONTENT_MAX_CHARS = 3_000;

/**
 * Max characters of the parent post sent as context when classifying a
 * discussion document. Kept short — the discussion body is what gets classified.
 */
export const CLASSIFIER_PARENT_CONTEXT_MAX_CHARS = 1_000;

/** Max new terms the LLM may propose for one document. */
export const MAX_PROPOSED_TERMS_PER_DOCUMENT = 10;

/**
 * Max characters of a proposed term description. Short on purpose: the
 * description is embedded together with the name and shown to the judge —
 * a one-line scope note, not an essay.
 */
export const PROPOSED_TERM_DESCRIPTION_MAX_CHARS = 150;

/**
 * Existing terms shown to the propose step as a vocabulary hint so proposals
 * reuse the workspace's naming when the document matches a known term.
 * Picked by document count, so it is the most-used terms, not all of them.
 */
export const TERM_VOCABULARY_HINT_LIMIT = 30;

/** Nearest existing terms retrieved per proposed term. */
export const TERM_CANDIDATES_PER_PROPOSAL = 5;

/**
 * Minimum cosine similarity for an existing term to count as a candidate for
 * a proposal. Below this the proposal has no plausible existing match.
 */
export const TERM_CANDIDATE_MIN_SIMILARITY = 0.6;

/**
 * Cosine similarity at or above which a proposal is treated as a duplicate of
 * an existing term and is never auto-created, even when the judge declines to
 * assign that term to the document.
 */
export const TERM_DUPLICATE_SIMILARITY = 0.9;
