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
