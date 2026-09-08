import { and, eq } from "drizzle-orm";

import { documents, topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetTopicParams, GetTopicResult } from "../types";
import { toTopicListItem } from "../utils/to-topic-list-item";

export async function getTopic(
  params: GetTopicParams,
  ctx: WorkspaceContext,
): Promise<GetTopicResult> {
  const [row] = await db
    .select({
      topic: topics,
      sourceDocumentId: documents.id,
      sourceDocumentTitle: documents.title,
      sourceDocumentSourceName: documents.sourceName,
      sourceDocumentSourceId: documents.sourceId,
    })
    .from(topics)
    .leftJoin(documents, eq(topics.sourceDocumentId, documents.id))
    .where(
      and(eq(topics.id, params.id), eq(topics.workspaceId, ctx.workspaceId)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("topic", params.id);
  }

  const item = toTopicListItem(row.topic);

  return {
    ...item,
    sourceDocument: row.sourceDocumentId
      ? {
          id: row.sourceDocumentId,
          title: row.sourceDocumentTitle,
          sourceName: row.sourceDocumentSourceName ?? "",
          sourceId: row.sourceDocumentSourceId ?? "",
        }
      : null,
  };
}
