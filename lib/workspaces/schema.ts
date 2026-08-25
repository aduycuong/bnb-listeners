import { z } from "zod";

export const workspaceFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Workspace name is required." }),
  slug: z.string().trim().optional(),
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
export type AddWorkspaceMemberFormValues = z.infer<
  typeof addWorkspaceMemberFormSchema
>;
