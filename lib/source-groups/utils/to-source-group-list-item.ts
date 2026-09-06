import type { SourceGroup } from "@/db/schema";

import type { SourceGroupListItem } from "../types";
import { getNoGroupId } from "./get-no-group-id";

export function toSourceGroupListItem(row: SourceGroup): SourceGroupListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isNoGroup: row.id === getNoGroupId(row.workspaceId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
