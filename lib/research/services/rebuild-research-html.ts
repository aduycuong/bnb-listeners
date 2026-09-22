import { and, eq } from "drizzle-orm";

import { researchRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { APIError } from "@/lib/exposers/api-error";
import { addJob } from "@/lib/qstash/services/add-job-service";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { GENERATE_RESEARCH_HTML_QSTASH_JOB_NAME } from "../config";
import type {
  RebuildResearchHtmlParams,
  RebuildResearchHtmlResult,
} from "../types";

/**
 * Re-enqueues the HTML-presentation job for a succeeded run. Backs the
 * dashboard "Rebuild" action. Resets the HTML lifecycle to `pending` so the
 * UI shows progress while the QStash worker regenerates `report_html`.
 */
export async function rebuildResearchHtml(
  params: RebuildResearchHtmlParams,
  ctx: WorkspaceContext,
): Promise<RebuildResearchHtmlResult> {
  const [run] = await db
    .select({
      id: researchRuns.id,
      status: researchRuns.status,
    })
    .from(researchRuns)
    .where(
      and(
        eq(researchRuns.id, params.runId),
        eq(researchRuns.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!run) {
    throw new NotFoundError("research run", params.runId);
  }

  if (run.status !== "succeeded") {
    throw new APIError(
      "PRECONDITION_FAILED",
      "The research run must succeed before generating an HTML presentation.",
      409,
    );
  }

  await db
    .update(researchRuns)
    .set({
      htmlStatus: "pending",
      htmlError: null,
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, params.runId));

  await addJob({
    jobName: GENERATE_RESEARCH_HTML_QSTASH_JOB_NAME,
    payload: { runId: params.runId },
    userId: ctx.userId,
  });

  return {
    id: params.runId,
    htmlStatus: "pending",
    message: "HTML presentation is being regenerated.",
  };
}
