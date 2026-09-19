import { and, eq, inArray } from "drizzle-orm";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";
import {
  DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN,
} from "@/lib/term-groups/term-group-member-rebuild-config";

import type { ClassifiedTermForGroups } from "../types";
import { applyLlmTermGroupAssignments } from "../utils/apply-llm-term-group-assignments";
import { evaluateTermsForTermGroups } from "../utils/evaluate-terms-for-term-groups";
import { loadTermGroupsForClassifier } from "../utils/load-term-groups-for-classifier";

type AssignTermGroupsAfterClassificationParams = {
  workspaceId: string;
  /** Ids of terms created during this classification run. */
  termIds: string[];
};

/**
 * Assigns freshly created terms to the workspace's term groups.
 *
 * Runs the same evaluator as the member rebuild (agent + Exa web research
 * when configured + confidence threshold), but for every group at once, and
 * only for terms that were just created — existing terms already went through
 * this step when they were created, or are curated via rebuild/admin.
 */
export async function assignTermGroupsAfterClassification(
  params: AssignTermGroupsAfterClassificationParams,
): Promise<void> {
  const uniqueTermIds = [...new Set(params.termIds)];
  if (uniqueTermIds.length === 0) {
    return;
  }

  const groups = await loadTermGroupsForClassifier(params.workspaceId);
  if (groups.length === 0) {
    return;
  }

  const termRows = await db
    .select({
      id: terms.id,
      name: terms.name,
      description: terms.description,
    })
    .from(terms)
    .where(
      and(
        eq(terms.workspaceId, params.workspaceId),
        inArray(terms.id, uniqueTermIds),
      ),
    );

  const classifiedTerms: ClassifiedTermForGroups[] = termRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
  }));

  if (classifiedTerms.length === 0) {
    return;
  }

  const prompt = await resolveWorkspaceSystemPrompt(
    params.workspaceId,
    "classify_term_groups",
  );

  const evaluations = await evaluateTermsForTermGroups(
    classifiedTerms,
    groups,
    prompt,
    DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
    true,
  );

  await applyLlmTermGroupAssignments({
    workspaceId: params.workspaceId,
    evaluations,
    confidenceMin: TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN,
  });
}
