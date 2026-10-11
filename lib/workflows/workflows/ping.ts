import type { RouteFunction } from "@upstash/workflow";
import { z } from "zod";

export const pingWorkflowPayloadSchema = z.object({
  message: z.string().trim().min(1).optional(),
});

export type PingWorkflowPayload = z.infer<typeof pingWorkflowPayloadSchema>;

export type PingWorkflowResult = {
  message: string;
  startedAt: string;
  finishedAt: string;
};

/**
 * Smoke test for the workflow setup: two durable steps around a short sleep.
 * Each step is a separate request, so the run exercises QStash callbacks,
 * signature verification and step replay end to end.
 */
export const pingWorkflow: RouteFunction<
  PingWorkflowPayload,
  PingWorkflowResult
> = async (context) => {
  const startedAt = await context.run("start", () => new Date().toISOString());

  await context.sleep("pause", 2);

  return context.run("finish", () => {
    const result = {
      message: context.requestPayload.message ?? "pong",
      startedAt,
      finishedAt: new Date().toISOString(),
    };

    console.log("[workflow:ping] finished", {
      workflowRunId: context.workflowRunId,
      ...result,
    });

    return result;
  });
};
