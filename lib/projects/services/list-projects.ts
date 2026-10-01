import { asc, eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { db } from "@/lib/db";

import type { ListProjectsParams, ListProjectsResult } from "../types";
import { toProjectListItem } from "../utils/to-project-list-item";

export async function listProjects(
  params: ListProjectsParams,
): Promise<ListProjectsResult> {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, params.workspaceId))
    .orderBy(asc(projects.createdAt));

  return {
    items: rows.map((row) => toProjectListItem(row)),
  };
}
