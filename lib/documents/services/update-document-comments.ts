import { jobRuns } from "@/db/schema";
import { CreateFailedError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { executeScrapeFacebookComments } from "@/lib/jobs/handlers/scrape-facebook/execute-scrape-facebook-comments";
import type { SchedulableJobType } from "@/lib/jobs/constants";
import { JOB_RUN_TYPE_FACEBOOK_COMMENTS } from "@/lib/jobs/run-types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  UpdateDocumentCommentsParams,
  UpdateDocumentCommentsResult,
} from "../types";
import { getDocument } from "./get-document";

function readPostUrl(metadata: Record<string, unknown>): string | null {
  const value = metadata.postUrl;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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
      const postUrl = readPostUrl(document.metadata);
      if (!postUrl) {
        throw new UnknownServiceError(
          "This document is missing the Facebook post URL needed to fetch comments.",
        );
      }

      const [run] = await db
        .insert(jobRuns)
        .values({
          jobId: document.jobId,
          status: "running",
          runType: JOB_RUN_TYPE_FACEBOOK_COMMENTS,
          result: {
            documentId: document.id,
          },
        })
        .returning();

      if (!run) {
        throw new CreateFailedError("job run");
      }

      const { snapshotId } = await executeScrapeFacebookComments(
        { postUrl },
        { jobId: document.jobId, jobRunId: run.id },
      );

      return {
        documentId: document.id,
        jobRunId: run.id,
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
