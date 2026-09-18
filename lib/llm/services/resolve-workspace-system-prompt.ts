import type { LlmPromptKey } from "../constants";
import {
  buildClassifyTermGroupsPrompt,
  buildClassifyTermsPrompt,
  buildEvaluateTermGroupMembershipPrompt,
  buildProposeTermPrompt,
  buildScoreCommentStancesPrompt,
  buildScoreMediaPartPrompt,
  buildScoreTextPartPrompt,
} from "../utils/build-system-prompt-from-settings";
import { getWorkspaceLlmSettings } from "@/lib/workspaces/services/get-workspace-llm-settings";

export async function resolveWorkspaceSystemPrompt(
  workspaceId: string,
  promptKey: LlmPromptKey,
): Promise<string> {
  const settings = await getWorkspaceLlmSettings(workspaceId);

  switch (promptKey) {
    case "classify_terms":
      return buildClassifyTermsPrompt(settings);
    case "classify_term_groups":
      return buildClassifyTermGroupsPrompt(settings);
    case "evaluate_term_group_membership":
      return buildEvaluateTermGroupMembershipPrompt(settings);
    case "propose_term":
      return buildProposeTermPrompt(settings);
    case "score_text_part":
      return buildScoreTextPartPrompt(settings);
    case "score_media_part":
      return buildScoreMediaPartPrompt(settings);
    case "score_comment_stances":
      return buildScoreCommentStancesPrompt(settings);
  }
}
