import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/common/service-errors";
import type { DeleteDocumentParams, DeleteDocumentResult } from "@/lib/documents/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export async function deleteDocument(
  params: DeleteDocumentParams,
  ctx: WorkspaceContext,
): Promise<DeleteDocumentResult> {
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

  return {
    id: deleted.id,
    message: `Document ${deleted.id} deleted successfully`,
  };
}
