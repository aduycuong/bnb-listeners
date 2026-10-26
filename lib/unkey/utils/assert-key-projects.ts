import { and, eq, inArray } from "drizzle-orm";

import { projects } from "@/db/schema";
import { InvalidInputError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

/** Every project a key is limited to belongs to its workspace. */
export async function assertKeyProjects(workspaceId: string, projectIds: string[] | null) {
  if (!projectIds) return;
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), inArray(projects.id, projectIds)));
  if (rows.length !== new Set(projectIds).size) {
    throw new InvalidInputError("Có project không thuộc workspace này.");
  }
}
