import { DuplicateError } from "@/lib/common/service-errors";

import { findTermByName } from "./find-term-by-name";

export async function assertUniqueTermName(
  projectId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await findTermByName(projectId, name, excludeId);
  if (existing) {
    throw new DuplicateError("term", existing.id, "with this name");
  }
}
