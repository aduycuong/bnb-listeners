import type { LlmPromptKey } from "../constants";
import {
  buildClassifyTermsPrompt,
  buildProposeTermPrompt,
  buildScoreCommentStancesPrompt,
  buildScoreRelevancePrompt,
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
    case "propose_term":
      return buildProposeTermPrompt(settings);
    case "score_relevance":
      return buildScoreRelevancePrompt(settings);
    case "score_comment_stances":
      return buildScoreCommentStancesPrompt(settings);
  }
}
