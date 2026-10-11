const NAME_KEYS = ["type", "name", "reaction_type"];
const COUNT_KEYS = ["reaction_count", "count", "num", "value"];

/**
 * Turns Bright Data's `num_reaction_type` array into `{ like: 3, love: 1 }`.
 * Entries without a recognizable name and count are ignored; returns null
 * when nothing usable is found.
 */
export function parseFacebookReactions(
  raw: unknown[] | null | undefined,
): Record<string, number> | null {
  const reactions: Record<string, number> = {};

  for (const entry of raw ?? []) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    const name = NAME_KEYS.map((key) => record[key]).find(
      (value): value is string => typeof value === "string" && !!value.trim(),
    );
    const count = COUNT_KEYS.map((key) => record[key]).find(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );

    if (name && count !== undefined) {
      const key = name.trim().toLowerCase();
      reactions[key] = (reactions[key] ?? 0) + count;
    }
  }

  return Object.keys(reactions).length > 0 ? reactions : null;
}
