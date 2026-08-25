import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  CreateFailedError,
  DuplicateError,
} from "@/lib/common/service-errors";
import { addJob } from "@/lib/qstash/services/add-job-service";
import type { CreateDocumentParams, CreateDocumentResult } from "@/lib/documents/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export async function createDocument(
  params: CreateDocumentParams,
  ctx: WorkspaceContext,
): Promise<CreateDocumentResult> {
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, ctx.workspaceId),
        eq(documents.docType, params.docType),
        eq(documents.sourceKey, params.sourceKey),
        eq(documents.sourceId, params.sourceId),
      ),
    )
    .limit(1);

  if (existing) {
    throw new DuplicateError("document", existing.id, "for this source");
  }

  const [doc] = await db
    .insert(documents)
    .values({
      workspaceId: ctx.workspaceId,
      docType: params.docType,
      sourceKey: params.sourceKey,
      sourceName: params.sourceName,
      sourceId: params.sourceId,
      title: params.title,
      rawContent: params.rawContent,
      metadata: params.metadata ?? {},
      publishedAt: params.publishedAt ? new Date(params.publishedAt) : null,
    })
    .returning();

  if (!doc) {
    throw new CreateFailedError("document");
  }

  await addJob({
    jobName: "process-document",
    payload: { documentId: doc.id },
    userId: ctx.userId,
  });

  return doc;
}
