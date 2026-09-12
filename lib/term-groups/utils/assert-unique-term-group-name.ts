import { DuplicateError } from "@/lib/common/service-errors";

import { findTermGroupByName } from "./find-term-group-by-name";

export async function assertUniqueTermGroupName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await findTermGroupByName(workspaceId, name, excludeId);
  if (existing) {
    throw new DuplicateError("term group", existing.id, "with this name");
  }
}
