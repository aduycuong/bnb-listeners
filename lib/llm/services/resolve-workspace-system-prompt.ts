import type { LlmPromptKey } from "../constants";
import {
  buildClassifyTopicsPrompt,
  buildProposeTopicPrompt,
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
    case "classify_topics":
      return buildClassifyTopicsPrompt(settings);
    case "propose_topic":
      return buildProposeTopicPrompt(settings);
    case "score_relevance":
      return buildScoreRelevancePrompt(settings);
    case "score_comment_stances":
      return buildScoreCommentStancesPrompt(settings);
  }
}
