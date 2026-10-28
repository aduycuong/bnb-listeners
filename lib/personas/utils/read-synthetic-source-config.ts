import { type SyntheticSourceConfig, syntheticSourceConfigSchema } from "../schema";

/** The schedule config kept in `sources.metadata`, or null when missing or no longer valid. */
export function readSyntheticSourceConfig(
  metadata: Record<string, unknown>,
): SyntheticSourceConfig | null {
  const parsed = syntheticSourceConfigSchema.safeParse(upgradeConfig(metadata.syntheticConfig));
  return parsed.success ? parsed.data : null;
}

/** Configs saved before the topic guide kept a `topics` list; it becomes the guide, one per line. */
function upgradeConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const config = value as Record<string, unknown>;
  if (config.topicGuide !== undefined || !Array.isArray(config.topics)) return value;
  return { ...config, topicGuide: config.topics.join("\n") };
}
