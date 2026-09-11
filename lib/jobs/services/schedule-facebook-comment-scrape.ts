import { z } from "zod";

import { addJob } from "@/lib/qstash/services/add-job-service";

import { SCRAPE_FACEBOOK_DOCUMENT_COMMENTS_JOB_NAME } from "../handlers/scrape-facebook/config";

export const scheduleFacebookCommentScrapePayloadSchema = z.object({
  documentId: z.string().min(1),
  attempt: z.int().positive(),
  maxComments: z.int().positive(),
});

export type ScheduleFacebookCommentScrapePayload = z.infer<
  typeof scheduleFacebookCommentScrapePayloadSchema
>;

export type ScheduleFacebookCommentScrapeParams =
  ScheduleFacebookCommentScrapePayload & {
    delaySeconds: number;
    userId?: string;
  };

export async function scheduleFacebookCommentScrape(
  params: ScheduleFacebookCommentScrapeParams,
): Promise<void> {
  const payload = scheduleFacebookCommentScrapePayloadSchema.parse({
    documentId: params.documentId,
    attempt: params.attempt,
    maxComments: params.maxComments,
  });

  await addJob({
    jobName: SCRAPE_FACEBOOK_DOCUMENT_COMMENTS_JOB_NAME,
    payload,
    delay: params.delaySeconds,
    userId: params.userId ?? "system",
  });

  console.log("[scrape-facebook] scheduled comment scrape", {
    documentId: payload.documentId,
    attempt: payload.attempt,
    maxComments: payload.maxComments,
    delaySeconds: params.delaySeconds,
  });
}
