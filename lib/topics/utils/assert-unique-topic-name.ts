import { DuplicateError } from "@/lib/common/service-errors";

import { findTopicByName } from "./find-topic-by-name";

export async function assertUniqueTopicName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await findTopicByName(workspaceId, name, excludeId);
  if (existing) {
    throw new DuplicateError("topic", existing.id, "with this name");
  }
}
