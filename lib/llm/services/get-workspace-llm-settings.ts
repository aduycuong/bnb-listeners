import { and, eq } from "drizzle-orm";

import { workspaceLlmPrompts } from "@/db/schema";
import { db } from "@/lib/db";

import {
  DEFAULT_PROPOSE_TOPIC_SETTINGS,
  DEFAULT_SCORE_RELEVANCE_SETTINGS,
  LLM_PROMPT_DEFINITIONS,
} from "../constants";
import type { GetWorkspaceLlmSettingsResult } from "../types";
import {
  buildProposeTopicPrompt,
  buildScoreRelevancePrompt,
} from "../utils/build-system-prompt-from-settings";
import { loadEditablePromptSettings } from "./resolve-workspace-system-prompt";

export async function getWorkspaceLlmSettings(
  workspaceId: string,
): Promise<GetWorkspaceLlmSettingsResult> {
  const rows = await db
    .select({
      promptKey: workspaceLlmPrompts.promptKey,
    })
    .from(workspaceLlmPrompts)
    .where(
      and(
        eq(workspaceLlmPrompts.workspaceId, workspaceId),
        eq(workspaceLlmPrompts.isEnabled, true),
      ),
    );

  const customKeys = new Set(rows.map((row) => row.promptKey));

  const proposeSettings =
    (await loadEditablePromptSettings(workspaceId, "propose_topic")) ??
    DEFAULT_PROPOSE_TOPIC_SETTINGS;
  const scoreSettings =
    (await loadEditablePromptSettings(workspaceId, "score_relevance")) ??
    DEFAULT_SCORE_RELEVANCE_SETTINGS;

  return {
    proposeTopic: {
      settings: proposeSettings,
      defaultSettings: DEFAULT_PROPOSE_TOPIC_SETTINGS,
      isCustom: customKeys.has("propose_topic"),
      preview: buildProposeTopicPrompt(proposeSettings),
    },
    scoreRelevance: {
      settings: scoreSettings,
      defaultSettings: DEFAULT_SCORE_RELEVANCE_SETTINGS,
      isCustom: customKeys.has("score_relevance"),
      preview: buildScoreRelevancePrompt(scoreSettings),
    },
  };
}

export function getWorkspaceLlmSettingsLabels() {
  return LLM_PROMPT_DEFINITIONS;
}
