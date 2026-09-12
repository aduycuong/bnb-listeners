import { and, eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function assertTermGroupInWorkspace(
  termGroupId: string,
  workspaceId: string,
): Promise<{ id: string; name: string }> {
  const [row] = await db
    .select({ id: termGroups.id, name: termGroups.name })
    .from(termGroups)
    .where(
      and(
        eq(termGroups.id, termGroupId),
        eq(termGroups.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("term group", termGroupId);
  }

  return row;
}
