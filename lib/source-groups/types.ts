import type { z } from "zod";

import type { SourceGroup } from "@/db/schema";

import type {
  createSourceGroupBodySchema,
  deleteSourceGroupBodySchema,
  sourceGroupFormSchema,
  updateSourceGroupBodySchema,
} from "./schema";

export type CreateSourceGroupBody = z.infer<typeof createSourceGroupBodySchema>;
export type CreateSourceGroupParams = CreateSourceGroupBody;
export type CreateSourceGroupResult = SourceGroupListItem;

export type UpdateSourceGroupBody = z.infer<typeof updateSourceGroupBodySchema>;
export type UpdateSourceGroupParams = { id: string } & UpdateSourceGroupBody;
export type UpdateSourceGroupResult = SourceGroupListItem;

export type DeleteSourceGroupBody = z.infer<typeof deleteSourceGroupBodySchema>;
export type DeleteSourceGroupParams = { id: string } & DeleteSourceGroupBody;
export type DeleteSourceGroupResult = { id: string; message: string };

export type ListSourceGroupsParams = Record<string, never> | undefined;
export type ListSourceGroupsResult = { items: SourceGroupListItem[] };

export type SourceGroupListItem = {
  id: string;
  name: string;
  description: string | null;
  /**
   * True when this is the auto-created workspace-scoped "Unassigned" group.
   * This group is excluded from the normal management list but shown in
   * filter dropdowns so users can see topics from unassigned documents.
   */
  isUnassigned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SourceGroupFormValues = z.infer<typeof sourceGroupFormSchema>;

export type { SourceGroup };
