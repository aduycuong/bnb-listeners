import { eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import { db } from "@/lib/db";

import type { ClassifierTermGroup } from "../types";

export async function loadTermGroupsForClassifier(
  workspaceId: string,
): Promise<ClassifierTermGroup[]> {
  const rows = await db
    .select({
      id: termGroups.id,
      name: termGroups.name,
      description: termGroups.description,
    })
    .from(termGroups)
    .where(eq(termGroups.workspaceId, workspaceId))
    .orderBy(termGroups.name);

  return rows;
}
