import { z } from "zod";

import {
  MAX_TERM_CRITERIA_LENGTH,
  TERM_LANGUAGES,
} from "@/lib/workspaces/constants";

export const termLanguageSchema = z.enum(TERM_LANGUAGES);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, { error: "Project name is required." }),
  description: z.string().trim().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, { error: "Project name is required." }).optional(),
  description: z.string().trim().nullable().optional(),
  autoCreateTerms: z.boolean().optional(),
  termLanguage: termLanguageSchema.optional(),
  termCriteria: z
    .string()
    .trim()
    .max(MAX_TERM_CRITERIA_LENGTH, {
      error: `Term criteria must be ${MAX_TERM_CRITERIA_LENGTH} characters or fewer.`,
    })
    .optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
export type UpdateProjectValues = z.infer<typeof updateProjectSchema>;
