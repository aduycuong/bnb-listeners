import { eq } from "drizzle-orm";

import { documents, sourceRuns, dataSources } from "@/db/schema";
import { CreateFailedError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { executeScrapeFacebookComments } from "@/lib/data-sources/handlers/scrape-facebook/execute-scrape-facebook-comments";
import { SOURCE_RUN_TYPE_FACEBOOK_COMMENTS } from "@/lib/data-sources/source-run-types";

export type StartFacebookDocumentCommentScrapeParams = {
  documentId: string;
  maxComments: number;
  attempt?: number;
};

export type StartFacebookDocumentCommentScrapeResult = {
  documentId: string;
  sourceRunId: string;
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
      dataSourceId: documents.dataSourceId,
      sourceType: dataSources.sourceType,
    })
    .from(documents)
    .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
    .where(eq(documents.id, params.documentId))
    .limit(1);

  if (!row?.dataSourceId) {
    throw new UnknownServiceError(
      "This document has no scrape dataSource and cannot fetch comments from source.",
    );
  }

  if (row.sourceType !== "scrape-facebook") {
    throw new UnknownServiceError(
      `Comment fetch is not supported for dataSource type "${row.sourceType}".`,
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
    .insert(sourceRuns)
    .values({
      dataSourceId: row.dataSourceId,
      status: "running",
      runType: SOURCE_RUN_TYPE_FACEBOOK_COMMENTS,
      result,
    })
    .returning();

  if (!run) {
    throw new CreateFailedError("source run");
  }

  const { snapshotId } = await executeScrapeFacebookComments(
    {
      postUrl,
      limitRecords: params.maxComments,
    },
    { dataSourceId: row.dataSourceId, sourceRunId: run.id },
  );

  return {
    documentId: params.documentId,
    sourceRunId: run.id,
    snapshotId,
  };
}
