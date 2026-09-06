import type { z } from "zod";

import type { SourceGroup } from "@/db/schema";

import type {
  createSourceGroupBodySchema,
  sourceGroupFormSchema,
  updateSourceGroupBodySchema,
} from "./schema";

export type CreateSourceGroupBody = z.infer<typeof createSourceGroupBodySchema>;
export type CreateSourceGroupParams = CreateSourceGroupBody;
export type CreateSourceGroupResult = SourceGroupListItem;

export type UpdateSourceGroupBody = z.infer<typeof updateSourceGroupBodySchema>;
export type UpdateSourceGroupParams = { id: string } & UpdateSourceGroupBody;
export type UpdateSourceGroupResult = SourceGroupListItem;

export type DeleteSourceGroupParams = { id: string };
export type DeleteSourceGroupResult = { id: string; message: string };

export type ListSourceGroupsParams = Record<string, never> | undefined;
export type ListSourceGroupsResult = { items: SourceGroupListItem[] };

export type SourceGroupListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceGroupFormValues = z.infer<typeof sourceGroupFormSchema>;

export type { SourceGroup };
