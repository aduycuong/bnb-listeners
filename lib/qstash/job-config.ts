import { processDocument } from "@/lib/documents/services/process-document";

export type QstashJobHandlerContext = {
  userId?: string;
};

export type QstashJobHandler = (
  payload: unknown,
  context: QstashJobHandlerContext
) => Promise<void> | void;

/**
 * Registry of QStash job handlers keyed by job name.
 *
 * Add new jobs here, e.g.:
 * "my-job-name": async (payload, ctx) => { ... }
 */
export const qstashJobHandlers: Record<string, QstashJobHandler> = {
  "noop-job": async () => {
    // Intentionally empty: placeholder job handler.
  },

  /**
   * Triggered after a document is created.
   * Scores quality dimensions and detects near-duplicates.
   * Payload: { documentId: string }
   */
  "process-document": processDocument,
};
