import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/common/service-errors";
import type { UpdateDocumentParams, UpdateDocumentResult } from "@/lib/documents/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export async function updateDocument(
  params: UpdateDocumentParams,
  ctx: WorkspaceContext,
): Promise<UpdateDocumentResult> {
  const { id, rawContent, ...rest } = params;

  const updates: Partial<typeof documents.$inferInsert> = { ...rest };

  if (rawContent !== undefined) {
    updates.rawContent = rawContent;
    updates.embeddingStatus = "pending";
  }

  const [doc] = await db
    .update(documents)
    .set(updates)
    .where(
      and(eq(documents.id, id), eq(documents.workspaceId, ctx.workspaceId)),
    )
    .returning();

  if (!doc) {
    throw new NotFoundError("document", id);
  }

  return doc;
}
