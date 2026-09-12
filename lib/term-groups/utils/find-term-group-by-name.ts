import { and, eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import { db } from "@/lib/db";

export async function findTermGroupByName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({ id: termGroups.id, name: termGroups.name })
    .from(termGroups)
    .where(
      and(
        eq(termGroups.workspaceId, workspaceId),
        eq(termGroups.name, name.trim()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || (excludeId && row.id === excludeId)) {
    return null;
  }

  return row;
}
