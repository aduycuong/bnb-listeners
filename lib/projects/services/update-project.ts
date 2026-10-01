import { and, eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { UpdateProjectParams, UpdateProjectResult } from "../types";
import { toProjectListItem } from "../utils/to-project-list-item";
import { assertUniqueProjectName } from "./assert-unique-project-name";

export async function updateProject(
  params: UpdateProjectParams,
): Promise<UpdateProjectResult> {
  const [current] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, params.projectId),
        eq(projects.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!current) {
    throw new NotFoundError("project", params.projectId);
  }

  const name = params.name?.trim() ?? current.name;
  if (name !== current.name) {
    await assertUniqueProjectName(params.workspaceId, name, current.id);
  }

  const description =
    params.description === undefined
      ? current.description
      : params.description?.trim() || null;

  const [project] = await db
    .update(projects)
    .set({
      name,
      description,
      autoCreateTerms: params.autoCreateTerms ?? current.autoCreateTerms,
      termLanguage: params.termLanguage ?? current.termLanguage,
      termCriteria:
        params.termCriteria === undefined
          ? current.termCriteria
          : params.termCriteria.trim(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, current.id))
    .returning();

  if (!project) {
    throw new NotFoundError("project", params.projectId);
  }

  return {
    ...toProjectListItem(project),
    message: "Project saved.",
  };
}
