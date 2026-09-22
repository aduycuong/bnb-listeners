import { GENERATE_RESEARCH_HTML_QSTASH_JOB_NAME } from "../config";
import { generateResearchHtmlJobPayloadSchema } from "../schema";
import { generateResearchHtml } from "./generate-research-html";

/**
 * QStash handler for the HTML-presentation job. Parses `{ runId }` and renders
 * the report to HTML. Registered in `lib/qstash/job-config.ts`.
 */
export async function handleGenerateResearchHtmlJob(
  payload: unknown,
): Promise<void> {
  const parsed = generateResearchHtmlJobPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[${GENERATE_RESEARCH_HTML_QSTASH_JOB_NAME}] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  await generateResearchHtml(parsed.data.runId);
}
