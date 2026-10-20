import { eq } from "drizzle-orm";

import { collectRuns, projects, projectSources } from "@/db/schema";
import { db } from "@/lib/db";
import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";

/** After a collect run: one incremental match per project following the run's source. */
export async function matchCollectRun(params: {
  collectRunId: string;
}): Promise<{ projects: number }> {
  const [run] = await db
    .select({ sourceId: collectRuns.sourceId })
    .from(collectRuns)
    .where(eq(collectRuns.id, params.collectRunId))
    .limit(1);
  if (!run?.sourceId) return { projects: 0 };

  const followers = await db
    .select({ id: projects.id })
    .from(projectSources)
    .innerJoin(projects, eq(projects.id, projectSources.projectId))
    .where(eq(projectSources.sourceId, run.sourceId));

  for (const project of followers) {
    await triggerWorkflow({
      name: "match-project",
      body: { projectId: project.id, collectRunId: params.collectRunId },
      workflowRunId: `match-${project.id}-${params.collectRunId}`,
      label: `match-${project.id}`,
    });
  }

  return { projects: followers.length };
}
