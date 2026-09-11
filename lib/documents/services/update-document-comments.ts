import { eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { readMaxComments } from "@/lib/jobs/handlers/scrape-facebook/config";
import type { SchedulableJobType } from "@/lib/jobs/constants";
import { startFacebookDocumentCommentScrape } from "@/lib/jobs/services/start-facebook-document-comment-scrape";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  UpdateDocumentCommentsParams,
  UpdateDocumentCommentsResult,
} from "../types";
import { getDocument } from "./get-document";

export async function updateDocumentComments(
  params: UpdateDocumentCommentsParams,
  ctx: WorkspaceContext,
): Promise<UpdateDocumentCommentsResult> {
  const document = await getDocument({ id: params.id }, ctx);

  if (!document.jobId || !document.jobType) {
    throw new UnknownServiceError(
      "This document has no scrape job and cannot fetch comments from source.",
    );
  }

  switch (document.jobType as SchedulableJobType) {
    case "scrape-facebook": {
      const [job] = await db
        .select({ params: jobs.params })
        .from(jobs)
        .where(eq(jobs.id, document.jobId))
        .limit(1);

      const { jobRunId, snapshotId } = await startFacebookDocumentCommentScrape(
        {
          documentId: document.id,
          maxComments: readMaxComments(job?.params),
        },
      );

      return {
        documentId: document.id,
        jobRunId,
        status: "running",
        message:
          "Comment fetch started. Comments will update when the scrape completes.",
        snapshotId,
      };
    }
    case "scrape-website":
      throw new UnknownServiceError(
        "Fetching comments for website documents is not supported yet.",
      );
    default:
      throw new UnknownServiceError(
        `Comment fetch is not supported for job type "${document.jobType}".`,
      );
  }
}
