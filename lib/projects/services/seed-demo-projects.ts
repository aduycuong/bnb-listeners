import { eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { db } from "@/lib/db";

import { DEMO_PROJECTS } from "../demo-projects";
import { createProject } from "./create-project";

export async function seedDemoProjects(params: {
  workspaceId: string;
}): Promise<{ created: string[]; skipped: string[] }> {
  const existing = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, params.workspaceId));
  const names = new Set(existing.map((row) => row.name));
  const created: string[] = [];
  const skipped: string[] = [];
  const orderBase = Date.parse("2026-01-01T00:00:00.000Z");

  for (const [index, demo] of DEMO_PROJECTS.entries()) {
    if (names.has(demo.name)) {
      skipped.push(demo.name);
      continue;
    }

    const project = await createProject({
      workspaceId: params.workspaceId,
      name: demo.name,
      description: demo.description,
      case: demo.case,
    });
    await db
      .update(projects)
      .set({ createdAt: new Date(orderBase + index * 1000) })
      .where(eq(projects.id, project.id));
    created.push(demo.name);
  }

  return { created, skipped };
}
