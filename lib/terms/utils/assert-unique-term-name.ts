import { DuplicateError } from "@/lib/common/service-errors";

import { findTermByName } from "./find-term-by-name";

export async function assertUniqueTermName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await findTermByName(workspaceId, name, excludeId);
  if (existing) {
    throw new DuplicateError("term", existing.id, "with this name");
  }
}
