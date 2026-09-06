import { and, eq, ne } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { DuplicateError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function assertUniqueSourceGroupName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [
    eq(sourceGroups.workspaceId, workspaceId),
    eq(sourceGroups.name, name),
  ];

  if (excludeId) {
    conditions.push(ne(sourceGroups.id, excludeId));
  }

  const [existing] = await db
    .select({ id: sourceGroups.id })
    .from(sourceGroups)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new DuplicateError("source group", existing.id, "with this name");
  }
}
