import type { TermGroup } from "@/db/schema";

import type { TermGroupListItem } from "../types";

export function toTermGroupListItem(
  row: TermGroup,
  memberCount: number,
): TermGroupListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    memberCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
