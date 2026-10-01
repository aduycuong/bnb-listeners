import { and, eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function assertProjectInWorkspace(params: {
  workspaceId: string;
  projectId: string;
}): Promise<void> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, params.projectId),
        eq(projects.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("project", params.projectId);
  }
}
