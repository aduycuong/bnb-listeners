import { DuplicateError } from "@/lib/common/service-errors";

import { findDataSourceGroupByName } from "./find-data-source-group-by-name";

export async function assertUniqueDataSourceGroupName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await findDataSourceGroupByName(
    workspaceId,
    name,
    excludeId,
  );
  if (existing) {
    throw new DuplicateError("data source group", existing.id, "with this name");
  }
}
