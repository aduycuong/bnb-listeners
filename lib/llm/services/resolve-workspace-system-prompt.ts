import type { LlmPromptKey } from "../constants";
import {
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
    case "propose_term":
      throw new Error(
        `${promptKey} is resolved per project, not from workspace settings.`,
      );
    case "score_text_part":
      return buildScoreTextPartPrompt(settings);
    case "score_media_part":
      return buildScoreMediaPartPrompt(settings);
    case "score_comment_stances":
      return buildScoreCommentStancesPrompt(settings);
  }
}
