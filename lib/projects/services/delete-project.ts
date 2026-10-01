import { and, eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { DeleteProjectParams, DeleteProjectResult } from "../types";

export async function deleteProject(
  params: DeleteProjectParams,
): Promise<DeleteProjectResult> {
  const [deleted] = await db
    .delete(projects)
    .where(
      and(
        eq(projects.id, params.projectId),
        eq(projects.workspaceId, params.workspaceId),
      ),
    )
    .returning({ id: projects.id });

  if (!deleted) {
    throw new NotFoundError("project", params.projectId);
  }

  return { message: "Project deleted." };
}
