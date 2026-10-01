import { projects } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { CreateProjectParams, CreateProjectResult } from "../types";
import { toProjectListItem } from "../utils/to-project-list-item";
import { assertUniqueProjectName } from "./assert-unique-project-name";

export async function createProject(
  params: CreateProjectParams,
): Promise<CreateProjectResult> {
  const name = params.name.trim();
  const description = params.description?.trim() || null;

  await assertUniqueProjectName(params.workspaceId, name);

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: params.workspaceId,
      name,
      description,
      listeningCase: params.case ?? "general",
    })
    .returning();

  if (!project) {
    throw new CreateFailedError("project");
  }

  return {
    ...toProjectListItem(project),
    message: "Project created.",
  };
}
