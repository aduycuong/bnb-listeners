import type { Clarification } from "../types";

/**
 * Merges user-provided context and clarification answers into a single
 * background block that the plan/triage prompts read. Clarifications are
 * just extra background gathered via the clarify round-trip.
 */
export function buildBackground(
  context?: string | null,
  clarifications?: Clarification[] | null,
): string {
  const parts: string[] = [];

  const trimmedContext = context?.trim();
  if (trimmedContext) {
    parts.push(trimmedContext);
  }

  const answered = (clarifications ?? []).filter(
    (item) => item.question.trim() && item.answer.trim(),
  );

  if (answered.length > 0) {
    const qa = answered
      .map((item) => `Q: ${item.question.trim()}\nA: ${item.answer.trim()}`)
      .join("\n\n");
    parts.push(`Clarifications:\n${qa}`);
  }

  return parts.join("\n\n");
}
