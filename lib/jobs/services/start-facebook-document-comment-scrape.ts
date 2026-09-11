import { eq } from "drizzle-orm";

import { documents, jobRuns, jobs } from "@/db/schema";
import { CreateFailedError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { executeScrapeFacebookComments } from "@/lib/jobs/handlers/scrape-facebook/execute-scrape-facebook-comments";
import { JOB_RUN_TYPE_FACEBOOK_COMMENTS } from "@/lib/jobs/run-types";

export type StartFacebookDocumentCommentScrapeParams = {
  documentId: string;
  maxComments: number;
  attempt?: number;
};

export type StartFacebookDocumentCommentScrapeResult = {
  documentId: string;
  jobRunId: string;
  snapshotId: string;
};

function readPostUrl(metadata: Record<string, unknown> | null): string | null {
  const value = metadata?.postUrl;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function startFacebookDocumentCommentScrape(
  params: StartFacebookDocumentCommentScrapeParams,
): Promise<StartFacebookDocumentCommentScrapeResult> {
  const [row] = await db
    .select({
      documentId: documents.id,
      metadata: documents.metadata,
      jobId: documents.jobId,
      jobType: jobs.jobType,
    })
    .from(documents)
    .innerJoin(jobs, eq(documents.jobId, jobs.id))
    .where(eq(documents.id, params.documentId))
    .limit(1);

  if (!row?.jobId) {
    throw new UnknownServiceError(
      "This document has no scrape job and cannot fetch comments from source.",
    );
  }

  if (row.jobType !== "scrape-facebook") {
    throw new UnknownServiceError(
      `Comment fetch is not supported for job type "${row.jobType}".`,
    );
  }

  const postUrl = readPostUrl(row.metadata);
  if (!postUrl) {
    throw new UnknownServiceError(
      "This document is missing the Facebook post URL needed to fetch comments.",
    );
  }

  const result: Record<string, unknown> = {
    documentId: params.documentId,
    maxComments: params.maxComments,
  };

  if (params.attempt != null) {
    result.attempt = params.attempt;
  }

  const [run] = await db
    .insert(jobRuns)
    .values({
      jobId: row.jobId,
      status: "running",
      runType: JOB_RUN_TYPE_FACEBOOK_COMMENTS,
      result,
    })
    .returning();

  if (!run) {
    throw new CreateFailedError("job run");
  }

  const { snapshotId } = await executeScrapeFacebookComments(
    {
      postUrl,
      limitRecords: params.maxComments,
    },
    { jobId: row.jobId, jobRunId: run.id },
  );

  return {
    documentId: params.documentId,
    jobRunId: run.id,
    snapshotId,
  };
}
