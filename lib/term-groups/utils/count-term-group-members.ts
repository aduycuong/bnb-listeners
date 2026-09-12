import { eq, sql } from "drizzle-orm";

import { termGroupMembers } from "@/db/schema";
import { db } from "@/lib/db";

export async function countTermGroupMembers(
  termGroupId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(termGroupMembers)
    .where(eq(termGroupMembers.termGroupId, termGroupId));

  return row?.count ?? 0;
}
