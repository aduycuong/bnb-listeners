import { sourceRuns } from "@/db/schema";
import { CreateFailedError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { executeScrapeFacebookPost } from "@/lib/data-sources/handlers/scrape-facebook/execute-scrape-facebook-post";
import type { SourceType } from "@/lib/data-sources/constants";
import { SOURCE_RUN_TYPE_FACEBOOK_POST } from "@/lib/data-sources/source-run-types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  RefreshDocumentFromSourceParams,
  RefreshDocumentFromSourceResult,
} from "../types";
import { getDocument } from "./get-document";

function readPostUrl(metadata: Record<string, unknown>): string | null {
  const value = metadata.postUrl;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function refreshDocumentFromSource(
  params: RefreshDocumentFromSourceParams,
  ctx: WorkspaceContext,
): Promise<RefreshDocumentFromSourceResult> {
  const document = await getDocument({ id: params.id }, ctx);

  if (!document.dataSourceId || !document.sourceType) {
    throw new UnknownServiceError(
      "This document has no scrape dataSource and cannot be refreshed from source.",
    );
  }

  switch (document.sourceType as SourceType) {
    case "scrape-facebook": {
      const postUrl = readPostUrl(document.metadata);
      if (!postUrl) {
        throw new UnknownServiceError(
          "This document is missing the Facebook post URL needed to re-fetch it.",
        );
      }

      const [run] = await db
        .insert(sourceRuns)
        .values({
          dataSourceId: document.dataSourceId,
          status: "running",
          runType: SOURCE_RUN_TYPE_FACEBOOK_POST,
        })
        .returning();

      if (!run) {
        throw new CreateFailedError("source run");
      }

      const { snapshotId } = await executeScrapeFacebookPost(
        { postUrl, sourceOriginKey: document.sourceOriginKey },
        { dataSourceId: document.dataSourceId, sourceRunId: run.id },
      );

      return {
        documentId: document.id,
        sourceRunId: run.id,
        status: "running",
        message: "Re-fetch started. Content will update when the scrape completes.",
        snapshotId,
      };
    }
    case "scrape-website":
      throw new UnknownServiceError(
        "Re-fetching website documents is not supported yet.",
      );
    default:
      throw new UnknownServiceError(
        `Re-fetch is not supported for dataSource type "${document.sourceType}".`,
      );
  }
}
