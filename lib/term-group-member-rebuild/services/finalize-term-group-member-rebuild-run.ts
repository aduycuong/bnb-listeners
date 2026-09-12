import { and, eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import type { TermGroupMemberRebuildRun } from "@/db/schema";
import { db } from "@/lib/db";

export async function finalizeTermGroupMemberRebuildRun(params: {
  run: TermGroupMemberRebuildRun;
  success: boolean;
}): Promise<void> {
  const { run } = params;

  await db
    .update(termGroups)
    .set({ activeMemberRebuildRunId: null })
    .where(
      and(
        eq(termGroups.id, run.termGroupId),
        eq(termGroups.activeMemberRebuildRunId, run.id),
      ),
    );
}
