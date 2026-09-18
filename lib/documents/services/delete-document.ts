import { and, eq } from "drizzle-orm";

import { documentParts, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { deleteObjectsFromR2 } from "@/lib/r2/services/delete-objects-from-r2";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteDocumentParams, DeleteDocumentResult } from "../types";

/**
 * Deletes a document. Parts and chunks cascade in the database; archived media
 * on R2 does not, so its object keys are collected first and removed after
 * the row is gone. R2 cleanup is best-effort — a storage error must not undo
 * a successful delete.
 */
export async function deleteDocument(
  params: DeleteDocumentParams,
  ctx: WorkspaceContext,
): Promise<DeleteDocumentResult> {
  const storageKeys = await db
    .select({ storageKey: documentParts.storageKey })
    .from(documentParts)
    .innerJoin(documents, eq(documentParts.documentId, documents.id))
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    );

  const [deleted] = await db
    .delete(documents)
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: documents.id });

  if (!deleted) {
    throw new NotFoundError("document", params.id);
  }

  const keys = storageKeys
    .map((row) => row.storageKey)
    .filter((key): key is string => Boolean(key));

  if (keys.length > 0) {
    try {
      await deleteObjectsFromR2({ keys });
    } catch (error) {
      console.warn(
        `[delete-document] Could not delete ${keys.length} R2 object(s) for document ${deleted.id}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    id: deleted.id,
    message: `Document ${deleted.id} deleted successfully`,
  };
}
