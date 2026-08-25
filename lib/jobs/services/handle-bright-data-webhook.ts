import { eq } from "drizzle-orm";

import { jobRuns, jobs } from "@/db/schema";
import { parseBrightDataScraperWebhookPayload } from "@/lib/bright-data/utils/parse-scraper-webhook-payload";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { upsertDocument } from "@/lib/documents/services/upsert-document";
import { parseFacebookPosts } from "@/lib/jobs/handlers/scrape-facebook/utils/parse-facebook-post";
import { mapPostToDocument } from "@/lib/jobs/handlers/scrape-facebook/utils/map-post-to-document";

type HandleBrightDataJobWebhookParams = {
  jobRunId: string;
  payload: unknown;
};

type UpsertSummary = {
  inserted: number;
  updated: number;
  unchanged: number;
};

async function upsertFacebookPostDocuments(
  output: unknown[],
  sourceKey: string,
  workspaceId: string,
): Promise<UpsertSummary> {
  const posts = parseFacebookPosts(output);
  const summary: UpsertSummary = { inserted: 0, updated: 0, unchanged: 0 };

  await Promise.all(
    posts.map(async (post) => {
      const params = mapPostToDocument({ sourceKey, post });
      const { outcome } = await upsertDocument(params, workspaceId);
      summary[outcome]++;
    }),
  );

  return summary;
}

export async function handleBrightDataJobWebhook(
  params: HandleBrightDataJobWebhookParams,
): Promise<{ ok: true }> {
  const parsedPayload = parseBrightDataScraperWebhookPayload(params.payload);

  console.log("[jobs] Bright Data webhook payload", {
    jobRunId: params.jobRunId,
    kind: parsedPayload.kind,
    payload:
      parsedPayload.kind === "success"
        ? parsedPayload.output
        : parsedPayload.error,
  });

  const [run] = await db
    .select({
      id: jobRuns.id,
      status: jobRuns.status,
      workspaceId: jobs.workspaceId,
      jobType: jobs.jobType,
      jobParams: jobs.params,
    })
    .from(jobRuns)
    .innerJoin(jobs, eq(jobRuns.jobId, jobs.id))
    .where(eq(jobRuns.id, params.jobRunId))
    .limit(1);

  if (!run) {
    throw new NotFoundError("job run", params.jobRunId);
  }

  if (run.status !== "running") {
    return { ok: true };
  }

  if (parsedPayload.kind === "error") {
    await db
      .update(jobRuns)
      .set({
        status: "failed",
        error: parsedPayload.error.message,
        finishedAt: new Date(),
      })
      .where(eq(jobRuns.id, run.id));

    return { ok: true };
  }

  const rawOutput = parsedPayload.output;
  const itemCount = Array.isArray(rawOutput) ? rawOutput.length : null;

  let upsertSummary: UpsertSummary | null = null;

  if (run.jobType === "scrape-facebook" && Array.isArray(rawOutput)) {
    const facebookUrl =
      typeof run.jobParams?.facebookUrl === "string"
        ? run.jobParams.facebookUrl
        : null;

    if (facebookUrl) {
      upsertSummary = await upsertFacebookPostDocuments(
        rawOutput,
        facebookUrl,
        run.workspaceId,
      );

      console.log("[jobs] scrape-facebook upsert complete", {
        jobRunId: params.jobRunId,
        ...upsertSummary,
      });
    }
  }

  await db
    .update(jobRuns)
    .set({
      status: "success",
      result: {
        ...(itemCount != null ? { itemCount } : { received: true }),
        ...(upsertSummary && { documents: upsertSummary }),
      },
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.id, run.id));

  return { ok: true };
}
