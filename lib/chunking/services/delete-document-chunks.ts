import { eq } from "drizzle-orm";

import { chunks } from "@/db/schema";
import { db } from "@/lib/db";

import type {
  DeleteDocumentChunksParams,
  DeleteDocumentChunksResult,
} from "../types";

/**
 * Removes every chunk of a document from the retrieval index.
 *
 * Called at the start of process-document so a document that is re-scored
 * below the threshold — or whose body changed — never leaves stale chunks
 * behind while the rest of the pipeline runs.
 */
export async function deleteDocumentChunks(
  params: DeleteDocumentChunksParams,
): Promise<DeleteDocumentChunksResult> {
  const result = await db
    .delete(chunks)
    .where(eq(chunks.documentId, params.documentId))
    .returning({ id: chunks.id });

  return { documentId: params.documentId, deleted: result.length };
}
