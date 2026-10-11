import { eq } from "drizzle-orm";

import { dataSources, documents } from "@/db/schema";
import { db } from "@/lib/db";

import { startFacebookDocumentCommentScrape } from "./start-facebook-document-comment-scrape";
import { scheduleFacebookCommentScrapePayloadSchema } from "./schedule-facebook-comment-scrape";

export async function scrapeFacebookDocumentComments(
  payload: unknown,
): Promise<
  | { documentId: string; sourceRunId: string; snapshotId: string }
  | { documentId: string; skipped: true }
> {
  const parsed = scheduleFacebookCommentScrapePayloadSchema.parse(payload);

  // Delayed follow-ups outlive their data source being disabled; stop the chain
  // there so a frozen pipeline does not keep spending scrape credits.
  const [row] = await db
    .select({ enabled: dataSources.enabled })
    .from(documents)
    .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
    .where(eq(documents.id, parsed.documentId))
    .limit(1);

  if (row && !row.enabled) {
    console.log("[scrape-facebook] skipped comment scrape for disabled data source", {
      documentId: parsed.documentId,
      attempt: parsed.attempt,
    });
    return { documentId: parsed.documentId, skipped: true };
  }

  return startFacebookDocumentCommentScrape({
    documentId: parsed.documentId,
    maxComments: parsed.maxComments,
    attempt: parsed.attempt,
  });
}
