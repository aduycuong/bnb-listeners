import { eq } from "drizzle-orm";

import { dataSourceGroupMembers } from "@/db/schema";
import { db } from "@/lib/db";

export async function listDataSourceGroupMemberIds(
  dataSourceGroupId: string,
): Promise<string[]> {
  const rows = await db
    .select({ dataSourceId: dataSourceGroupMembers.dataSourceId })
    .from(dataSourceGroupMembers)
    .where(
      eq(dataSourceGroupMembers.dataSourceGroupId, dataSourceGroupId),
    );

  return rows.map((row) => row.dataSourceId);
}
