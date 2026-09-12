import { parseChatModel } from "@/lib/langchain";
import { isExaConfigured } from "@/lib/exa/services/exa-answer";
import {
  DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN,
} from "@/lib/term-groups/term-group-member-rebuild-config";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  EstimateTermGroupMemberRebuildParams,
  EstimateTermGroupMemberRebuildResult,
} from "../types";
import { countRebuildCandidates } from "../utils/count-rebuild-candidates";
import { estimateRebuildCost } from "../utils/estimate-rebuild-cost";
import { loadTermGroupRebuildContext } from "../utils/load-term-group-rebuild-context";

export async function estimateTermGroupMemberRebuild(
  params: EstimateTermGroupMemberRebuildParams,
  ctx: WorkspaceContext,
): Promise<EstimateTermGroupMemberRebuildResult> {
  await loadTermGroupRebuildContext(params.id, ctx.workspaceId);

  const model = parseChatModel(
    params.model,
    DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  );
  const includeAlreadyMembers = params.includeAlreadyMembers;
  const removeNonMatching = params.removeNonMatching;
  const enableWebResearch = params.enableWebResearch;
  const confidenceMin =
    params.confidenceMin ?? TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN;

  const termCount = await countRebuildCandidates({
    workspaceId: ctx.workspaceId,
    termGroupId: params.id,
    includeAlreadyMembers,
  });

  const estimate = estimateRebuildCost({
    termCount,
    model,
    enableWebResearch,
  });

  return {
    model,
    includeAlreadyMembers,
    removeNonMatching,
    enableWebResearch,
    confidenceMin,
    estimate,
    webResearchAvailable: isExaConfigured(),
  };
}
