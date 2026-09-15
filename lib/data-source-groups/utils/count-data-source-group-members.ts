import { eq, sql } from "drizzle-orm";

import { dataSourceGroupMembers } from "@/db/schema";
import { db } from "@/lib/db";

export async function countDataSourceGroupMembers(
  dataSourceGroupId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(dataSourceGroupMembers)
    .where(
      eq(dataSourceGroupMembers.dataSourceGroupId, dataSourceGroupId),
    );

  return row?.count ?? 0;
}
