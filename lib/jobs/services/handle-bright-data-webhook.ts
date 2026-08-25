import { eq } from "drizzle-orm";

import { jobRuns } from "@/db/schema";
import { parseBrightDataScraperWebhookPayload } from "@/lib/bright-data/utils/parse-scraper-webhook-payload";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

type HandleBrightDataJobWebhookParams = {
  jobRunId: string;
  payload: unknown;
};

function getPayloadItemCount(payload: unknown): number | null {
  return Array.isArray(payload) ? payload.length : null;
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
    })
    .from(jobRuns)
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

  const itemCount = getPayloadItemCount(parsedPayload.output);

  await db
    .update(jobRuns)
    .set({
      status: "success",
      result: itemCount == null ? { received: true } : { itemCount },
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.id, run.id));

  return { ok: true };
}
