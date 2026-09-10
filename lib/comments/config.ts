import type { ChatModelId } from "@/lib/langchain";

/** QStash job that scores unscored comments on one parent document. */
export const SCORE_DOCUMENT_COMMENTS_JOB_NAME = "score-document-comments";

/** Comments sent to the LLM in a single structured-output call. */
export const COMMENT_STANCE_BATCH_SIZE = 50;

/** Model for batch stance scoring — cheap, high volume. */
export const COMMENT_STANCE_MODEL: ChatModelId = "gpt-4.1-mini";

/** Truncate the parent post body before sending it as stance context. */
export const PARENT_CONTENT_MAX_CHARS = 2_000;

/** Truncate each comment body in the LLM user message. */
export const COMMENT_CONTENT_MAX_CHARS = 500;

/** doc_type of the companion document that holds substantive comments for RAG. */
export const DISCUSSION_DOC_TYPE = "discussion";

/** Communicative role of a comment relative to its parent post. */
export const COMMENT_ROLES = ["debate", "answer", "info", "other"] as const;

/** Stance relative to the parent — only meaningful when role = debate. */
export const COMMENT_STANCES = ["agree", "disagree", "neutral"] as const;
