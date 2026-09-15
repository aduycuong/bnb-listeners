import type { DataSourceGroup } from "@/db/schema";

import type { DataSourceGroupListItem } from "../types";

export function toDataSourceGroupListItem(
  row: DataSourceGroup,
  memberCount: number,
): DataSourceGroupListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    memberCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
