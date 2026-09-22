import { RESEARCH_TERM_PERIODS } from "../config";

/**
 * Prompt fragment shared by the plan and evaluate nodes describing the
 * available task kinds and when to use each. Keep in sync with
 * `researchTaskSchema`.
 */
export function buildTaskGuidance(): string {
  return [
    "Available task kinds:",
    '- "search": semantic/keyword search over the workspace knowledge base (posts, comments, documents) and, when available, the web. Use for qualitative evidence: opinions, examples, explanations, context.',
    '- "term_analytics": quantitative statistics for tracked terms (keywords/topics) over a period — document counts, trend score, quality score, docs over time. Use only when the goal involves volume, trends, growth, comparison over time, or ranking of topics. Fill `query` with the broad subject for candidate terms, then fill `selectionCriteria.include` and `selectionCriteria.exclude` with the precise acceptance/rejection rules inferred from the goal and background. These criteria are mandatory: distinguish a concrete entity from information merely related to it whenever that distinction matters. For example, for a request about individual real-estate projects, include only terms that are names of specific projects and exclude market, price, policy, property-type, and general-industry terms. Use an empty `query` only for workspace-wide top terms, with unrestricted criteria (`include`: "All active tracked terms", `exclude`: "None").',
    `Allowed periods for term_analytics: ${RESEARCH_TERM_PERIODS.join(", ")}.`,
    "Most research needs several search tasks and at most one or two term_analytics tasks; do not add analytics when the goal is purely qualitative.",
  ].join("\n");
}
