import { and, eq } from "drizzle-orm";

import { workspaceLlmPrompts } from "@/db/schema";
import { db } from "@/lib/db";

import type { EditableLlmPromptKey } from "../constants";
import type {
  UpdateWorkspaceLlmSettingsParams,
  UpdateWorkspaceLlmSettingsResult,
} from "../types";
import {
  isDefaultProposeTopicSettings,
  isDefaultScoreRelevanceSettings,
  normalizeProposeTopicSettings,
  normalizeScoreRelevanceSettings,
} from "../utils/build-system-prompt-from-settings";

async function upsertOrDeletePromptSettings(params: {
  workspaceId: string;
  userId: string;
  promptKey: EditableLlmPromptKey;
  settings: Record<string, unknown>;
  isDefault: boolean;
}) {
  if (params.isDefault) {
    await db
      .delete(workspaceLlmPrompts)
      .where(
        and(
          eq(workspaceLlmPrompts.workspaceId, params.workspaceId),
          eq(workspaceLlmPrompts.promptKey, params.promptKey),
        ),
      );
    return;
  }

  await db
    .insert(workspaceLlmPrompts)
    .values({
      workspaceId: params.workspaceId,
      promptKey: params.promptKey,
      settings: params.settings,
      isEnabled: true,
      updatedBy: params.userId,
    })
    .onConflictDoUpdate({
      target: [workspaceLlmPrompts.workspaceId, workspaceLlmPrompts.promptKey],
      set: {
        settings: params.settings,
        isEnabled: true,
        updatedBy: params.userId,
        updatedAt: new Date(),
      },
    });
}

export async function updateWorkspaceLlmSettings(
  params: UpdateWorkspaceLlmSettingsParams,
): Promise<UpdateWorkspaceLlmSettingsResult> {
  const proposeTopic = normalizeProposeTopicSettings(params.proposeTopic);
  const scoreRelevance = normalizeScoreRelevanceSettings(params.scoreRelevance);

  await upsertOrDeletePromptSettings({
    workspaceId: params.workspaceId,
    userId: params.userId,
    promptKey: "propose_topic",
    settings: proposeTopic,
    isDefault: isDefaultProposeTopicSettings(proposeTopic),
  });

  await upsertOrDeletePromptSettings({
    workspaceId: params.workspaceId,
    userId: params.userId,
    promptKey: "score_relevance",
    settings: scoreRelevance,
    isDefault: isDefaultScoreRelevanceSettings(scoreRelevance),
  });

  return { message: "LLM settings saved." };
}
