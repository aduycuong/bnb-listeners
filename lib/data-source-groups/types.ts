import type { z } from "zod";

import type {
  createDataSourceGroupBodySchema,
  dataSourceGroupFormSchema,
  setDataSourceGroupMembersBodySchema,
  updateDataSourceGroupBodySchema,
} from "./schema";

export type CreateDataSourceGroupBody = z.infer<
  typeof createDataSourceGroupBodySchema
>;
export type CreateDataSourceGroupParams = CreateDataSourceGroupBody;
export type UpdateDataSourceGroupBody = z.infer<
  typeof updateDataSourceGroupBodySchema
>;
export type UpdateDataSourceGroupParams = { id: string } &
  UpdateDataSourceGroupBody;
export type DeleteDataSourceGroupParams = { id: string };
export type GetDataSourceGroupParams = { id: string };
export type SetDataSourceGroupMembersParams = {
  id: string;
} & z.infer<typeof setDataSourceGroupMembersBodySchema>;

export type DataSourceGroupListItem = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListDataSourceGroupsResult = { items: DataSourceGroupListItem[] };

export type DataSourceGroupDetail = DataSourceGroupListItem;

export type DataSourceGroupMemberItem = {
  id: string;
  name: string;
  sourceType: string;
  enabled: boolean;
  assignedBy: string;
  assignedAt: string;
};

export type ListDataSourceGroupMembersParams = { id: string };
export type ListDataSourceGroupMembersResult = {
  items: DataSourceGroupMemberItem[];
};

export type CreateDataSourceGroupResult = DataSourceGroupListItem;
export type UpdateDataSourceGroupResult = DataSourceGroupListItem;
export type DeleteDataSourceGroupResult = { id: string; message: string };
export type SetDataSourceGroupMembersResult = {
  id: string;
  memberCount: number;
  message: string;
};

export type DataSourceGroupFormValues = z.infer<
  typeof dataSourceGroupFormSchema
>;
