import type {
  EditableLlmPromptKey,
  LlmPromptSettingsMap,
  ProposeTopicPromptSettings,
  ScoreRelevancePromptSettings,
  WorkspaceLlmPromptSettings,
} from "./constants";
import {
  DEFAULT_PROPOSE_TOPIC_SETTINGS,
  DEFAULT_SCORE_RELEVANCE_SETTINGS,
} from "./constants";

export type ProposeTopicSettingsFormItem = {
  settings: ProposeTopicPromptSettings;
  defaultSettings: ProposeTopicPromptSettings;
  isCustom: boolean;
  preview: string;
};

export type ScoreRelevanceSettingsFormItem = {
  settings: ScoreRelevancePromptSettings;
  defaultSettings: ScoreRelevancePromptSettings;
  isCustom: boolean;
  preview: string;
};

export type GetWorkspaceLlmSettingsResult = {
  proposeTopic: ProposeTopicSettingsFormItem;
  scoreRelevance: ScoreRelevanceSettingsFormItem;
};

export type UpdateWorkspaceLlmSettingsParams = {
  workspaceId: string;
  userId: string;
  proposeTopic: ProposeTopicPromptSettings;
  scoreRelevance: ScoreRelevancePromptSettings;
};

export type UpdateWorkspaceLlmSettingsResult = {
  message: string;
};

export type LlmPromptSettingsByKey = {
  [K in EditableLlmPromptKey]: LlmPromptSettingsMap[K];
};

export function isProposeTopicSettings(
  settings: WorkspaceLlmPromptSettings,
): settings is ProposeTopicPromptSettings {
  return "topicLanguage" in settings;
}

export function isScoreRelevanceSettings(
  settings: WorkspaceLlmPromptSettings,
): settings is ScoreRelevancePromptSettings {
  return "domainDescription" in settings;
}

export function getDefaultPromptSettings<K extends EditableLlmPromptKey>(
  promptKey: K,
): LlmPromptSettingsMap[K] {
  if (promptKey === "propose_topic") {
    return { ...DEFAULT_PROPOSE_TOPIC_SETTINGS } as LlmPromptSettingsMap[K];
  }
  return { ...DEFAULT_SCORE_RELEVANCE_SETTINGS } as LlmPromptSettingsMap[K];
}
