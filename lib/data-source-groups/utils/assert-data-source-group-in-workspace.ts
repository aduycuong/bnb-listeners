import { and, eq } from "drizzle-orm";

import { dataSourceGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function assertDataSourceGroupInWorkspace(
  dataSourceGroupId: string,
  workspaceId: string,
): Promise<{ id: string; name: string }> {
  const [row] = await db
    .select({ id: dataSourceGroups.id, name: dataSourceGroups.name })
    .from(dataSourceGroups)
    .where(
      and(
        eq(dataSourceGroups.id, dataSourceGroupId),
        eq(dataSourceGroups.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("data source group", dataSourceGroupId);
  }

  return row;
}
