import type { SourceGroup } from "@/db/schema";

import type { SourceGroupListItem } from "../types";
import { getUnassignedGroupId } from "./get-unassigned-group-id";

export function toSourceGroupListItem(row: SourceGroup): SourceGroupListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isUnassigned: row.id === getUnassignedGroupId(row.workspaceId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
