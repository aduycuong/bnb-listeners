import { eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export type TermGroupRebuildContext = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  activeMemberRebuildRunId: string | null;
};

export async function loadTermGroupRebuildContext(
  termGroupId: string,
  workspaceId: string,
): Promise<TermGroupRebuildContext> {
  const [group] = await db
    .select({
      id: termGroups.id,
      workspaceId: termGroups.workspaceId,
      name: termGroups.name,
      description: termGroups.description,
      activeMemberRebuildRunId: termGroups.activeMemberRebuildRunId,
    })
    .from(termGroups)
    .where(eq(termGroups.id, termGroupId))
    .limit(1);

  if (!group || group.workspaceId !== workspaceId) {
    throw new NotFoundError("term_group", termGroupId);
  }

  return group;
}
