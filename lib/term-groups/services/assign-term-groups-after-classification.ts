import { inArray } from "drizzle-orm";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";
import { classifyTermGroupsWithLlm } from "@/lib/classification/utils/classify-term-groups-with-llm";
import type { ClassifiedTermForGroups } from "@/lib/classification/types";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";

import { applyLlmTermGroupAssignments } from "../utils/apply-llm-term-group-assignments";
import { loadTermGroupsForClassifier } from "../utils/load-term-groups-for-classifier";

type AssignTermGroupsAfterClassificationParams = {
  workspaceId: string;
  termIds: string[];
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  };
};

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
      inArray(terms.id, uniqueTermIds),
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

  const assignments = await classifyTermGroupsWithLlm(
    params.doc,
    classifiedTerms,
    groups,
    prompt,
  );

  await applyLlmTermGroupAssignments(params.workspaceId, assignments);
}
