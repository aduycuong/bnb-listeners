import { and, eq, ne } from "drizzle-orm";

import { projects } from "@/db/schema";
import { DuplicateError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function assertUniqueProjectName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [
    eq(projects.workspaceId, workspaceId),
    eq(projects.name, name),
  ];

  if (excludeId) {
    conditions.push(ne(projects.id, excludeId));
  }

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new DuplicateError("project", existing.id, "Name is already used.");
  }
}
