import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  BulkDeleteTermsParams,
  BulkDeleteTermsFailure,
  BulkDeleteTermsResult,
} from "../types";
import { deleteTerm } from "./delete-term";

export async function bulkDeleteTerms(
  params: BulkDeleteTermsParams,
  ctx: WorkspaceContext,
): Promise<BulkDeleteTermsResult> {
  const ids = [...new Set(params.ids)];
  const deletedIds: string[] = [];
  const failures: BulkDeleteTermsFailure[] = [];

  for (const id of ids) {
    try {
      await deleteTerm({ id }, ctx);
      deletedIds.push(id);
    } catch (error) {
      failures.push({
        id,
        message:
          error instanceof Error ? error.message : "Could not delete term.",
      });
    }
  }

  if (failures.length === 0) {
    return {
      deletedIds,
      failures,
      message:
        deletedIds.length === 1
          ? "Term deleted."
          : `${deletedIds.length} terms deleted.`,
    };
  }

  if (deletedIds.length > 0) {
    return {
      deletedIds,
      failures,
      message: `${deletedIds.length} of ${ids.length} terms deleted.`,
    };
  }

  return {
    deletedIds,
    failures,
    message: failures[0]?.message ?? "Could not delete terms.",
  };
}
