import { z } from "zod";

import {
  MAX_DATA_COLLECTION_SCOPE_LENGTH,
  MAX_TOPIC_CRITERIA_LENGTH,
  TOPIC_LANGUAGES,
} from "./constants";

export const workspaceFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Workspace name is required." }),
  slug: z.string().trim().optional(),
});

export const topicLanguageSchema = z.enum(TOPIC_LANGUAGES);

export const updateWorkspaceLlmSettingsSchema = z.object({
  dataCollectionScope: z
    .string()
    .trim()
    .min(1, { error: "Data collection scope is required." })
    .max(MAX_DATA_COLLECTION_SCOPE_LENGTH, {
      error: `Data collection scope must be ${MAX_DATA_COLLECTION_SCOPE_LENGTH} characters or fewer.`,
    }),
  autoCreateTopics: z.boolean(),
  topicLanguage: topicLanguageSchema,
  topicCriteria: z
    .string()
    .trim()
    .max(MAX_TOPIC_CRITERIA_LENGTH, {
      error: `Topic criteria must be ${MAX_TOPIC_CRITERIA_LENGTH} characters or fewer.`,
    }),
});

export const createWorkspaceFormSchema = workspaceFormSchema.pick({ name: true });

export const updateWorkspaceGeneralSchema = workspaceFormSchema;

export const addWorkspaceMemberFormSchema = z.object({
  email: z
    .email({ error: "Enter a valid email address." })
    .trim()
    .transform((value) => value.toLowerCase()),
  permission: z.enum(["read", "edit", "owner"]),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceFormSchema>;
export type UpdateWorkspaceGeneralFormValues = z.infer<
  typeof updateWorkspaceGeneralSchema
>;
export type UpdateWorkspaceLlmSettingsValues = z.infer<
  typeof updateWorkspaceLlmSettingsSchema
>;
export type AddWorkspaceMemberFormValues = z.infer<
  typeof addWorkspaceMemberFormSchema
>;
