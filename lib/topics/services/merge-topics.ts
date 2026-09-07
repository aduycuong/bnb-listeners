import { and, eq, inArray } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { addDocumentTopicAssignmentsFromSources } from "@/lib/document-topics/services/add-document-topic-assignments-from-sources";
import { db } from "@/lib/db";
import { bulkInvalidateTopicDigests } from "@/lib/topic-digests/services/bulk-invalidate-workspace-digests";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TOPIC_MERGE_MAX_SOURCES } from "../topic-config";
import type {
  MergeTopicsFailure,
  MergeTopicsParams,
  MergeTopicsResult,
} from "../types";
import { createTopic } from "./create-topic";
import { deleteTopic } from "./delete-topic";

async function loadWorkspaceTopics(
  topicIds: string[],
  workspaceId: string,
): Promise<Map<string, { id: string; name: string }>> {
  if (topicIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ id: topics.id, name: topics.name })
    .from(topics)
    .where(
      and(
        eq(topics.workspaceId, workspaceId),
        inArray(topics.id, topicIds),
      ),
    );

  return new Map(rows.map((row) => [row.id, row]));
}

export async function mergeTopics(
  params: MergeTopicsParams,
  ctx: WorkspaceContext,
): Promise<MergeTopicsResult> {
  const sourceIds = [...new Set(params.sourceIds)];

  if (sourceIds.length === 0) {
    throw new UnknownServiceError("At least one source topic is required.");
  }

  if (sourceIds.length > TOPIC_MERGE_MAX_SOURCES) {
    throw new UnknownServiceError(
      `Cannot merge more than ${TOPIC_MERGE_MAX_SOURCES} source topics at once.`,
    );
  }

  if (params.targetId && sourceIds.includes(params.targetId)) {
    throw new UnknownServiceError(
      "The target topic cannot also be a source topic.",
    );
  }

  let targetId = params.targetId;
  let targetName: string;

  if (params.newTopic) {
    const created = await createTopic(params.newTopic, ctx);
    targetId = created.id;
    targetName = created.name;
  } else if (targetId) {
    const [target] = await db
      .select({ id: topics.id, name: topics.name })
      .from(topics)
      .where(
        and(eq(topics.id, targetId), eq(topics.workspaceId, ctx.workspaceId)),
      )
      .limit(1);

    if (!target) {
      throw new NotFoundError("topic", targetId);
    }

    targetName = target.name;
  } else {
    throw new UnknownServiceError("Provide either targetId or newTopic.");
  }

  const topicById = await loadWorkspaceTopics(sourceIds, ctx.workspaceId);
  const missingSourceIds = sourceIds.filter((id) => !topicById.has(id));

  if (missingSourceIds.length > 0) {
    throw new NotFoundError("topic", missingSourceIds[0]!);
  }

  const { documentsAssigned } = await addDocumentTopicAssignmentsFromSources({
    sourceTopicIds: sourceIds,
    targetTopicId: targetId,
  });

  await bulkInvalidateTopicDigests({ topicIds: [targetId] });

  const deletedIds: string[] = [];
  const failures: MergeTopicsFailure[] = [];

  for (const id of sourceIds) {
    try {
      await deleteTopic({ id }, ctx);
      deletedIds.push(id);
    } catch (error) {
      failures.push({
        id,
        message:
          error instanceof Error ? error.message : "Could not delete topic.",
      });
    }
  }

  const sourceNames = sourceIds
    .map((id) => topicById.get(id)?.name ?? id)
    .join(", ");

  if (failures.length === 0) {
    return {
      targetId,
      targetName,
      deletedIds,
      failures,
      documentsAssigned,
      message:
        documentsAssigned > 0
          ? `Merged ${sourceNames} into “${targetName}”.`
          : `Merged ${sourceNames} into “${targetName}”. No documents were assigned.`,
    };
  }

  if (deletedIds.length > 0) {
    return {
      targetId,
      targetName,
      deletedIds,
      failures,
      documentsAssigned,
      message: `Merged into “${targetName}”, but ${failures.length} source topic${failures.length === 1 ? "" : "s"} could not be deleted.`,
    };
  }

  return {
    targetId,
    targetName,
    deletedIds,
    failures,
    documentsAssigned,
    message:
      failures[0]?.message ??
      "Documents were reassigned, but source topics could not be deleted.",
  };
}
