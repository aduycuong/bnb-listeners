import type { SourceGroup } from "@/db/schema";

import type { SourceGroupListItem } from "../types";

export function toSourceGroupListItem(row: SourceGroup): SourceGroupListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
