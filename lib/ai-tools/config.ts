/** Settings of the AI tools (docs/decisions.md D27). */
export const AI_TOOLS_CONFIG = {
  /** Period used when a tool call gives none: the dashboard default. */
  defaultPeriod: { type: "rolling", days: 14 },
  /** Characters of a mention's text, and of its root post, sent back by `search_mentions`. */
  mentionTextLength: 600,
  rootTextLength: 200,
  serverName: "bnb-listening",
  serverVersion: "1.0.0",
} as const;
