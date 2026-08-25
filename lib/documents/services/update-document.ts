import { and, eq } from "drizzle-orm";

import { documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type {
  UpdateDocumentParams,
  UpdateDocumentResult,
} from "@/lib/documents/types";
import { addJob } from "@/lib/qstash/services/add-job-service";
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
    updates.isDuplicate = false;
    updates.canonicalId = null;
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

  if (rawContent !== undefined) {
    await addJob({
      jobName: "process-document",
      payload: { documentId: doc.id },
      userId: ctx.userId,
    });
  }

  return doc;
}
