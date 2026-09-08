import { and, eq } from "drizzle-orm";

import { workspaceLlmPrompts } from "@/db/schema";
import { db } from "@/lib/db";

import type { EditableLlmPromptKey, LlmPromptKey } from "../constants";
import {
  DEFAULT_PROPOSE_TOPIC_SETTINGS,
  DEFAULT_SCORE_RELEVANCE_SETTINGS,
} from "../constants";
import type {
  ProposeTopicPromptSettings,
  ScoreRelevancePromptSettings,
} from "../constants";
import {
  buildClassifyTopicsPrompt,
  buildProposeTopicPrompt,
  buildScoreRelevancePrompt,
  parseProposeTopicSettings,
  parseScoreRelevanceSettings,
} from "../utils/build-system-prompt-from-settings";

export async function resolveWorkspaceSystemPrompt(
  workspaceId: string,
  promptKey: LlmPromptKey,
): Promise<string> {
  if (promptKey === "classify_topics") {
    return buildClassifyTopicsPrompt();
  }

  const [row] = await db
    .select({ settings: workspaceLlmPrompts.settings })
    .from(workspaceLlmPrompts)
    .where(
      and(
        eq(workspaceLlmPrompts.workspaceId, workspaceId),
        eq(workspaceLlmPrompts.promptKey, promptKey),
        eq(workspaceLlmPrompts.isEnabled, true),
      ),
    )
    .limit(1);

  if (promptKey === "propose_topic") {
    const settings = row
      ? parseProposeTopicSettings(row.settings)
      : DEFAULT_PROPOSE_TOPIC_SETTINGS;
    return buildProposeTopicPrompt(settings);
  }

  const settings = row
    ? parseScoreRelevanceSettings(row.settings)
    : DEFAULT_SCORE_RELEVANCE_SETTINGS;
  return buildScoreRelevancePrompt(settings);
}

export async function loadEditablePromptSettings(
  workspaceId: string,
  promptKey: "propose_topic",
): Promise<ProposeTopicPromptSettings | null>;
export async function loadEditablePromptSettings(
  workspaceId: string,
  promptKey: "score_relevance",
): Promise<ScoreRelevancePromptSettings | null>;
export async function loadEditablePromptSettings(
  workspaceId: string,
  promptKey: EditableLlmPromptKey,
): Promise<ProposeTopicPromptSettings | ScoreRelevancePromptSettings | null> {
  const [row] = await db
    .select({ settings: workspaceLlmPrompts.settings })
    .from(workspaceLlmPrompts)
    .where(
      and(
        eq(workspaceLlmPrompts.workspaceId, workspaceId),
        eq(workspaceLlmPrompts.promptKey, promptKey),
        eq(workspaceLlmPrompts.isEnabled, true),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  if (promptKey === "propose_topic") {
    return parseProposeTopicSettings(row.settings);
  }

  return parseScoreRelevanceSettings(row.settings);
}
