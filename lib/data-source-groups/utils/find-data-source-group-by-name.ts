import { and, eq } from "drizzle-orm";

import { dataSourceGroups } from "@/db/schema";
import { db } from "@/lib/db";

export async function findDataSourceGroupByName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({ id: dataSourceGroups.id, name: dataSourceGroups.name })
    .from(dataSourceGroups)
    .where(
      and(
        eq(dataSourceGroups.workspaceId, workspaceId),
        eq(dataSourceGroups.name, name.trim()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || (excludeId && row.id === excludeId)) {
    return null;
  }

  return row;
}
