import { and, eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function assertSourceGroupInWorkspace(
  workspaceId: string,
  groupId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: sourceGroups.id })
    .from(sourceGroups)
    .where(
      and(
        eq(sourceGroups.id, groupId),
        eq(sourceGroups.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("source group", groupId);
  }
}
