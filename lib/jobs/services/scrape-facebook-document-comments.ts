import { startFacebookDocumentCommentScrape } from "./start-facebook-document-comment-scrape";
import { scheduleFacebookCommentScrapePayloadSchema } from "./schedule-facebook-comment-scrape";

export async function scrapeFacebookDocumentComments(
  payload: unknown,
): Promise<{ documentId: string; jobRunId: string; snapshotId: string }> {
  const parsed = scheduleFacebookCommentScrapePayloadSchema.parse(payload);

  return startFacebookDocumentCommentScrape({
    documentId: parsed.documentId,
    maxComments: parsed.maxComments,
    attempt: parsed.attempt,
  });
}
