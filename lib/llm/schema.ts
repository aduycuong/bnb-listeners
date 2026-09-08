import { z } from "zod";

import {
  MAX_LLM_DOMAIN_DESCRIPTION_LENGTH,
  MAX_LLM_GUIDELINES_LENGTH,
  MAX_LLM_SCORING_GUIDE_LENGTH,
  TOPIC_LANGUAGES,
} from "./constants";

export const topicLanguageSchema = z.enum(TOPIC_LANGUAGES);

export const proposeTopicPromptSettingsSchema = z.object({
  topicLanguage: topicLanguageSchema,
  guidelines: z
    .string()
    .trim()
    .max(MAX_LLM_GUIDELINES_LENGTH, {
      error: `Guidelines must be ${MAX_LLM_GUIDELINES_LENGTH} characters or fewer.`,
    }),
});

export const scoreRelevancePromptSettingsSchema = z.object({
  domainDescription: z
    .string()
    .trim()
    .min(1, { error: "Domain description is required." })
    .max(MAX_LLM_DOMAIN_DESCRIPTION_LENGTH, {
      error: `Domain description must be ${MAX_LLM_DOMAIN_DESCRIPTION_LENGTH} characters or fewer.`,
    }),
  scoringGuide: z
    .string()
    .trim()
    .max(MAX_LLM_SCORING_GUIDE_LENGTH, {
      error: `Scoring guide must be ${MAX_LLM_SCORING_GUIDE_LENGTH} characters or fewer.`,
    }),
});

export const updateWorkspaceLlmSettingsSchema = z.object({
  proposeTopic: proposeTopicPromptSettingsSchema,
  scoreRelevance: scoreRelevancePromptSettingsSchema,
});

export type UpdateWorkspaceLlmSettingsBody = z.infer<
  typeof updateWorkspaceLlmSettingsSchema
>;

export function parseTopicLanguage(value: string) {
  const parsed = topicLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : "auto";
}
