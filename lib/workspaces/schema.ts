import { z } from "zod";

import { TOPIC_LANGUAGES } from "./constants";

export const workspaceFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Workspace name is required." }),
  slug: z.string().trim().optional(),
});

export const topicLanguageSchema = z.enum(TOPIC_LANGUAGES);

export const updateWorkspaceSettingsSchema = z.object({
  topicScope: z
    .string()
    .trim()
    .min(1, { error: "Topic scope is required." })
    .max(500, { error: "Topic scope must be 500 characters or fewer." }),
  topicLanguage: topicLanguageSchema,
});

export const createWorkspaceFormSchema = workspaceFormSchema.pick({ name: true });

export const addWorkspaceMemberFormSchema = z.object({
  email: z
    .email({ error: "Enter a valid email address." })
    .trim()
    .transform((value) => value.toLowerCase()),
  permission: z.enum(["read", "edit", "owner"]),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceFormSchema>;
export type UpdateWorkspaceSettingsValues = z.infer<
  typeof updateWorkspaceSettingsSchema
>;
export type AddWorkspaceMemberFormValues = z.infer<
  typeof addWorkspaceMemberFormSchema
>;
