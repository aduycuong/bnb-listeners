import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  BulkDeleteTopicsParams,
  BulkDeleteTopicsFailure,
  BulkDeleteTopicsResult,
} from "../types";
import { deleteTopic } from "./delete-topic";

export async function bulkDeleteTopics(
  params: BulkDeleteTopicsParams,
  ctx: WorkspaceContext,
): Promise<BulkDeleteTopicsResult> {
  const ids = [...new Set(params.ids)];
  const deletedIds: string[] = [];
  const failures: BulkDeleteTopicsFailure[] = [];

  for (const id of ids) {
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

  if (failures.length === 0) {
    return {
      deletedIds,
      failures,
      message:
        deletedIds.length === 1
          ? "Topic deleted."
          : `${deletedIds.length} topics deleted.`,
    };
  }

  if (deletedIds.length > 0) {
    return {
      deletedIds,
      failures,
      message: `${deletedIds.length} of ${ids.length} topics deleted.`,
    };
  }

  return {
    deletedIds,
    failures,
    message: failures[0]?.message ?? "Could not delete topics.",
  };
}
