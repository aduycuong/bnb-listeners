import { and, eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { db } from "@/lib/db";

import { DEMO_PROJECTS } from "../demo-projects";
import { createProject } from "./create-project";

export async function seedDemoProjects(params: {
  workspaceId: string;
}): Promise<{ created: string[]; renamed: string[]; skipped: string[] }> {
  const existing = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, params.workspaceId));
  const names = new Set(existing.map((row) => row.name));
  const created: string[] = [];
  const renamed: string[] = [];
  const skipped: string[] = [];
  const orderBase = Date.parse("2026-01-01T00:00:00.000Z");

  for (const [index, demo] of DEMO_PROJECTS.entries()) {
    if (names.has(demo.name)) {
      skipped.push(demo.name);
      continue;
    }

    const legacy = existing.find((row) => demo.legacyNames.includes(row.name));
    if (legacy) {
      await db
        .update(projects)
        .set({
          name: demo.name,
          description: demo.description,
          listeningCase: demo.case,
        })
        .where(
          and(eq(projects.id, legacy.id), eq(projects.workspaceId, params.workspaceId)),
        );
      names.delete(legacy.name);
      names.add(demo.name);
      renamed.push(`${legacy.name} → ${demo.name}`);
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
    names.add(demo.name);
    created.push(demo.name);
  }

  return { created, renamed, skipped };
}
