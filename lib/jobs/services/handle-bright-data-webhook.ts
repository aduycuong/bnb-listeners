import { eq } from "drizzle-orm";

import { jobRuns, jobs } from "@/db/schema";
import { parseBrightDataScraperWebhookPayload } from "@/lib/bright-data/utils/parse-scraper-webhook-payload";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { upsertComments } from "@/lib/comments/services/upsert-comments";
import { upsertDocument } from "@/lib/documents/services/upsert-document";
import {
  FACEBOOK_COMMENT_SCRAPE_DELAYS_SECONDS,
  FACEBOOK_COMMENT_SCRAPE_MAX_ATTEMPTS,
  readCommentScrapeAttempt,
  readMaxComments,
  readScrapePostComments,
} from "@/lib/jobs/handlers/scrape-facebook/config";
import {
  JOB_RUN_TYPE_FACEBOOK_COMMENTS,
  JOB_RUN_TYPE_FACEBOOK_POST,
  JOB_RUN_TYPE_FACEBOOK_POSTS,
} from "@/lib/jobs/run-types";
import { scheduleFacebookCommentScrape } from "@/lib/jobs/services/schedule-facebook-comment-scrape";
import { mapCommentToUpsertItem } from "@/lib/jobs/handlers/scrape-facebook/utils/map-comment-to-upsert-item";
import { mapPostToDocument } from "@/lib/jobs/handlers/scrape-facebook/utils/map-post-to-document";
import { parseFacebookComments } from "@/lib/jobs/handlers/scrape-facebook/utils/parse-facebook-comment";
import { parseFacebookPosts } from "@/lib/jobs/handlers/scrape-facebook/utils/parse-facebook-post";

type HandleBrightDataJobWebhookParams = {
  jobRunId: string;
  payload: unknown;
};

type UpsertSummary = {
  inserted: number;
  updated: number;
  unchanged: number;
};

function readDocumentId(
  result: Record<string, unknown> | null | undefined,
): string | null {
  const value = result?.documentId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type UpsertFacebookPostDocumentsResult = {
  summary: UpsertSummary;
  insertedDocumentIds: string[];
};

async function upsertFacebookPostDocuments(
  output: unknown[],
  sourceKey: string,
  workspaceId: string,
  jobRunId: string,
  jobId: string,
): Promise<UpsertFacebookPostDocumentsResult> {
  const posts = parseFacebookPosts(output);
  const summary: UpsertSummary = { inserted: 0, updated: 0, unchanged: 0 };
  const insertedDocumentIds: string[] = [];

  await Promise.all(
    posts.map(async (post) => {
      const params = mapPostToDocument({ sourceKey, post });
      const { documentId, outcome } = await upsertDocument(
        { ...params, jobRunId, jobId },
        workspaceId,
      );
      summary[outcome]++;
      if (outcome === "inserted") {
        insertedDocumentIds.push(documentId);
      }
    }),
  );

  return { summary, insertedDocumentIds };
}

async function scheduleInitialFacebookCommentScrapes(
  insertedDocumentIds: string[],
  jobParams: Record<string, unknown> | null,
): Promise<void> {
  if (insertedDocumentIds.length === 0 || !readScrapePostComments(jobParams)) {
    return;
  }

  const maxComments = readMaxComments(jobParams);

  await Promise.all(
    insertedDocumentIds.map((documentId) =>
      scheduleFacebookCommentScrape({
        documentId,
        attempt: 1,
        maxComments,
        delaySeconds: FACEBOOK_COMMENT_SCRAPE_DELAYS_SECONDS.first,
      }),
    ),
  );
}

async function scheduleNextFacebookCommentScrape(
  documentId: string,
  attempt: number,
  maxComments: number,
  insertedCount: number,
): Promise<void> {
  if (attempt >= FACEBOOK_COMMENT_SCRAPE_MAX_ATTEMPTS) {
    return;
  }

  const delaySeconds =
    insertedCount > 0
      ? FACEBOOK_COMMENT_SCRAPE_DELAYS_SECONDS.afterNewComments
      : FACEBOOK_COMMENT_SCRAPE_DELAYS_SECONDS.afterNoNewComments;

  await scheduleFacebookCommentScrape({
    documentId,
    attempt: attempt + 1,
    maxComments,
    delaySeconds,
  });
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
      runType: jobRuns.runType,
      jobId: jobRuns.jobId,
      result: jobRuns.result,
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
  let commentsSummary: UpsertSummary | null = null;

  if (
    run.runType === JOB_RUN_TYPE_FACEBOOK_COMMENTS &&
    Array.isArray(rawOutput)
  ) {
    const documentId = readDocumentId(run.result);

    if (documentId) {
      const parsedComments = parseFacebookComments(rawOutput);

      if (parsedComments.length > 0) {
        commentsSummary = await upsertComments({
          documentId,
          comments: parsedComments.map(mapCommentToUpsertItem),
        });
      } else {
        commentsSummary = { inserted: 0, updated: 0, unchanged: 0 };
      }

      console.log("[jobs] facebook-comments upsert complete", {
        jobRunId: params.jobRunId,
        documentId,
        itemCount: parsedComments.length,
        ...commentsSummary,
      });

      const attempt = readCommentScrapeAttempt(run.result);
      if (
        attempt != null &&
        readScrapePostComments(run.jobParams) &&
        commentsSummary
      ) {
        const maxComments =
          typeof run.result?.maxComments === "number"
            ? run.result.maxComments
            : readMaxComments(run.jobParams);

        await scheduleNextFacebookCommentScrape(
          documentId,
          attempt,
          maxComments,
          commentsSummary.inserted,
        );
      }
    }
  } else if (
    (run.runType === JOB_RUN_TYPE_FACEBOOK_POSTS ||
      run.runType === JOB_RUN_TYPE_FACEBOOK_POST) &&
    Array.isArray(rawOutput)
  ) {
    const facebookUrl =
      typeof run.jobParams?.facebookUrl === "string"
        ? run.jobParams.facebookUrl
        : null;

    if (facebookUrl) {
      const { summary, insertedDocumentIds } = await upsertFacebookPostDocuments(
        rawOutput,
        facebookUrl,
        run.workspaceId,
        run.id,
        run.jobId,
      );
      upsertSummary = summary;

      await scheduleInitialFacebookCommentScrapes(
        insertedDocumentIds,
        run.jobParams,
      );

      console.log("[jobs] scrape-facebook upsert complete", {
        jobRunId: params.jobRunId,
        ...upsertSummary,
        scheduledCommentScrapes: insertedDocumentIds.length,
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
        ...(commentsSummary && { comments: commentsSummary }),
      },
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.id, run.id));

  return { ok: true };
}
