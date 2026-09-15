import { eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { readMaxComments } from "@/lib/data-sources/handlers/scrape-facebook/config";
import type { SourceType } from "@/lib/data-sources/constants";
import { startFacebookDocumentCommentScrape } from "@/lib/data-sources/services/start-facebook-document-comment-scrape";
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

  if (!document.dataSourceId || !document.sourceType) {
    throw new UnknownServiceError(
      "This document has no scrape dataSource and cannot fetch comments from source.",
    );
  }

  switch (document.sourceType as SourceType) {
    case "scrape-facebook": {
      const [dataSource] = await db
        .select({ params: dataSources.params })
        .from(dataSources)
        .where(eq(dataSources.id, document.dataSourceId))
        .limit(1);

      const { sourceRunId, snapshotId } = await startFacebookDocumentCommentScrape(
        {
          documentId: document.id,
          maxComments: readMaxComments(dataSource?.params),
        },
      );

      return {
        documentId: document.id,
        sourceRunId,
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
        `Comment fetch is not supported for dataSource type "${document.sourceType}".`,
      );
  }
}
