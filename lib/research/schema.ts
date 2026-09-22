import { z } from "zod";

import { RESEARCH_TERM_PERIODS } from "./config";

/** Payload dispatched to the QStash research job handler. */
export const researchJobPayloadSchema = z.object({
  runId: z.uuid(),
});

export type ResearchJobPayload = z.infer<typeof researchJobPayloadSchema>;

/** Payload dispatched to the QStash HTML-generation job handler. */
export const generateResearchHtmlJobPayloadSchema = z.object({
  runId: z.uuid(),
});

export type GenerateResearchHtmlJobPayload = z.infer<
  typeof generateResearchHtmlJobPayloadSchema
>;

/** Evidence-gathering task: semantic/keyword search over internal + web. */
const searchTaskSchema = z.object({
  kind: z.literal("search"),
  query: z
    .string()
    .min(1)
    .describe(
      "Search query for the workspace knowledge base (and the web when available). Use the language most likely used by the source content.",
    ),
});

/** Evidence-gathering task: quantitative term statistics over a period. */
const termSelectionCriteriaSchema = z.object({
  include: z
    .string()
    .min(1)
    .describe(
      "Required traits a tracked term must satisfy. State whether it must be a concrete named entity, a category, a brand, a location, etc.",
    ),
  exclude: z
    .string()
    .min(1)
    .describe(
      "Terms to reject even when related to the subject. Use 'None' only when every related term should be included.",
    ),
});

const termAnalyticsTaskSchema = z.object({
  kind: z.literal("term_analytics"),
  query: z
    .string()
    .describe(
      "Subject used to identify candidate tracked terms. Empty string = top terms across the whole workspace and requires unrestricted selection criteria.",
    ),
  selectionCriteria: termSelectionCriteriaSchema.describe(
    "Mandatory criteria for accepting or rejecting candidate tracked terms. Fill every field from the research goal and background.",
  ),
  period: z
    .enum(RESEARCH_TERM_PERIODS)
    .describe("Statistics window (relative preset)."),
});

/**
 * One unit of evidence gathering. Adding a new data source = add a member
 * here and a matching runner in `lib/research/sources/run-research-task.ts`.
 *
 * Deliberately `z.union`, not `z.discriminatedUnion`: Zod 4 emits the latter
 * as JSON Schema `oneOf`, which OpenAI structured outputs reject; `z.union`
 * emits `anyOf`. Type inference is identical.
 */
export const researchTaskSchema = z.union([
  searchTaskSchema,
  termAnalyticsTaskSchema,
]);

/** Structured output of the plan node. */
export const researchPlanSchema = z.object({
  plan: z
    .string()
    .describe("Short research plan: the key sub-questions to answer."),
  tasks: z
    .array(researchTaskSchema)
    .describe("Concrete evidence-gathering tasks to run for the first iteration."),
});

/** Structured output of the evaluate/reflect node. */
export const researchEvaluationSchema = z.object({
  sufficient: z
    .boolean()
    .describe("True when current findings cover the plan well enough."),
  gaps: z
    .array(z.string())
    .describe("Remaining gaps in coverage; empty when sufficient."),
  newTasks: z
    .array(researchTaskSchema)
    .describe(
      "New, non-duplicate tasks that would close the gaps; empty when sufficient.",
    ),
});

/** Request body for starting a research run from the dashboard API. */
export const startResearchBodySchema = z.object({
  query: z.string().min(1, { error: "Query is required." }),
  context: z.string().optional(),
  clarifications: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .optional(),
  clarificationMode: z.enum(["ask", "assume", "off"]).optional(),
  depth: z.enum(["quick", "standard", "deep"]).optional(),
});

/** Structured output of the synchronous triage step. */
export const researchTriageSchema = z.object({
  relevant: z
    .boolean()
    .describe(
      "True when the research goal falls within (or plausibly overlaps) the workspace data-collection scope.",
    ),
  irrelevanceReason: z
    .string()
    .describe(
      "One short sentence, in the language of the research goal, explaining why the goal is outside the workspace scope. Empty string when relevant.",
    ),
  clear: z
    .boolean()
    .describe("True when the request is clear enough to research without asking."),
  questions: z
    .array(z.string().min(1))
    .describe("Clarifying questions to ask the user; empty when clear."),
});
