import { type SyntheticSourceConfig, syntheticSourceConfigSchema } from "../schema";

/** The schedule config kept in `sources.metadata`, or null when missing or no longer valid. */
export function readSyntheticSourceConfig(
  metadata: Record<string, unknown>,
): SyntheticSourceConfig | null {
  const parsed = syntheticSourceConfigSchema.safeParse(metadata.syntheticConfig);
  return parsed.success ? parsed.data : null;
}
