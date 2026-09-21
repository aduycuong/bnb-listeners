import { RESEARCH_QSTASH_JOB_NAME } from "../config";
import { researchJobPayloadSchema } from "../schema";
import { runResearch } from "./run-research";

/**
 * QStash handler for the research job. Parses `{ runId }` and runs the research
 * loop. Registered in `lib/qstash/job-config.ts`.
 */
export async function handleResearchJob(payload: unknown): Promise<void> {
  const parsed = researchJobPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[${RESEARCH_QSTASH_JOB_NAME}] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  await runResearch(parsed.data.runId);
}
