import { and, eq, inArray } from "drizzle-orm";

import { terms } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { addDocumentTermAssignmentsFromSources } from "@/lib/document-terms/services/add-document-term-assignments-from-sources";
import { db } from "@/lib/db";
import { bulkInvalidateTermDigests } from "@/lib/term-digests/services/bulk-invalidate-workspace-digests";
import { transferTermGroupMemberships } from "@/lib/term-groups/utils/transfer-term-group-memberships";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TERM_MERGE_MAX_SOURCES } from "../term-config";
import type {
  MergeTermsFailure,
  MergeTermsParams,
  MergeTermsResult,
} from "../types";
import { createTerm } from "./create-term";
import { deleteTerm } from "./delete-term";

async function loadWorkspaceTerms(
  termIds: string[],
  workspaceId: string,
): Promise<Map<string, { id: string; name: string }>> {
  if (termIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ id: terms.id, name: terms.name })
    .from(terms)
    .where(
      and(
        eq(terms.workspaceId, workspaceId),
        inArray(terms.id, termIds),
      ),
    );

  return new Map(rows.map((row) => [row.id, row]));
}

export async function mergeTerms(
  params: MergeTermsParams,
  ctx: WorkspaceContext,
): Promise<MergeTermsResult> {
  const sourceIds = [...new Set(params.sourceIds)];

  if (sourceIds.length === 0) {
    throw new UnknownServiceError("At least one source term is required.");
  }

  if (sourceIds.length > TERM_MERGE_MAX_SOURCES) {
    throw new UnknownServiceError(
      `Cannot merge more than ${TERM_MERGE_MAX_SOURCES} source terms at once.`,
    );
  }

  if (params.targetId && sourceIds.includes(params.targetId)) {
    throw new UnknownServiceError(
      "The target term cannot also be a source term.",
    );
  }

  let targetId = params.targetId;
  let targetName: string;

  if (params.newTerm) {
    const created = await createTerm(params.newTerm, ctx);
    targetId = created.id;
    targetName = created.name;
  } else if (targetId) {
    const [target] = await db
      .select({ id: terms.id, name: terms.name })
      .from(terms)
      .where(
        and(eq(terms.id, targetId), eq(terms.workspaceId, ctx.workspaceId)),
      )
      .limit(1);

    if (!target) {
      throw new NotFoundError("term", targetId);
    }

    targetName = target.name;
  } else {
    throw new UnknownServiceError("Provide either targetId or newTerm.");
  }

  const termById = await loadWorkspaceTerms(sourceIds, ctx.workspaceId);
  const missingSourceIds = sourceIds.filter((id) => !termById.has(id));

  if (missingSourceIds.length > 0) {
    throw new NotFoundError("term", missingSourceIds[0]!);
  }

  const { documentsAssigned } = await addDocumentTermAssignmentsFromSources({
    sourceTermIds: sourceIds,
    targetTermId: targetId,
  });

  await bulkInvalidateTermDigests({ termIds: [targetId] });
  await transferTermGroupMemberships(sourceIds, targetId);

  const deletedIds: string[] = [];
  const failures: MergeTermsFailure[] = [];

  for (const id of sourceIds) {
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

  const sourceNames = sourceIds
    .map((id) => termById.get(id)?.name ?? id)
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
      message: `Merged into “${targetName}”, but ${failures.length} source term${failures.length === 1 ? "" : "s"} could not be deleted.`,
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
      "Documents were reassigned, but source terms could not be deleted.",
  };
}
