import { z } from "zod";

/** Payload dispatched to the QStash research job handler. */
export const researchJobPayloadSchema = z.object({
  runId: z.uuid(),
});

export type ResearchJobPayload = z.infer<typeof researchJobPayloadSchema>;

/** Structured output of the plan node. */
export const researchPlanSchema = z.object({
  plan: z
    .string()
    .describe("Short research plan: the key sub-questions to answer."),
  subQueries: z
    .array(z.string().min(1))
    .describe("Concrete search queries to run for the first iteration."),
});

/** Structured output of the evaluate/reflect node. */
export const researchEvaluationSchema = z.object({
  sufficient: z
    .boolean()
    .describe("True when current findings cover the plan well enough."),
  gaps: z
    .array(z.string())
    .describe("Remaining gaps in coverage; empty when sufficient."),
  newQueries: z
    .array(z.string().min(1))
    .describe("New search queries that would close the gaps; empty when sufficient."),
});

/** Structured output of the synchronous triage step. */
export const researchTriageSchema = z.object({
  clear: z
    .boolean()
    .describe("True when the request is clear enough to research without asking."),
  questions: z
    .array(z.string().min(1))
    .describe("Clarifying questions to ask the user; empty when clear."),
});
