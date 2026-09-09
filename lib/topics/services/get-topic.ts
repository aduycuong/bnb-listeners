import { and, eq } from "drizzle-orm";

import { documents, topicBackfillRuns, topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { toTopicBackfillRunItem } from "@/lib/topic-backfill/utils/to-topic-backfill-run-item";
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

  let activeBackfillRun = null;

  if (row.topic.activeBackfillRunId) {
    const [run] = await db
      .select()
      .from(topicBackfillRuns)
      .where(eq(topicBackfillRuns.id, row.topic.activeBackfillRunId))
      .limit(1);

    if (run) {
      activeBackfillRun = toTopicBackfillRunItem(run);
    }
  }

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
    activeBackfillRun,
  };
}
