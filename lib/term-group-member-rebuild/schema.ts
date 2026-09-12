import { z } from "zod";

import { chatModelIdSchema } from "@/lib/langchain";
import { TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN } from "@/lib/term-groups/term-group-member-rebuild-config";

export const termGroupMemberRebuildEstimateBodySchema = z.object({
  model: chatModelIdSchema.optional(),
  /** When true, re-evaluate terms already in this group. */
  includeAlreadyMembers: z.boolean().optional().default(false),
  /** When true, remove members that no longer match after evaluation. */
  removeNonMatching: z.boolean().optional().default(false),
  /** When true, allow the agent to call Exa Answer for web research. */
  enableWebResearch: z.boolean().optional().default(true),
  confidenceMin: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN),
});

export const termGroupMemberRebuildCreateBodySchema =
  termGroupMemberRebuildEstimateBodySchema;

export const termGroupMemberRebuildRunIdParamsSchema = z.object({
  id: z.uuid(),
  runId: z.uuid(),
});
