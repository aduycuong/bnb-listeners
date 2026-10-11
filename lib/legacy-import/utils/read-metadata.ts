/** Typed reads from legacy `metadata` jsonb, which has no schema. */
export const readMetadata = {
  string(metadata: Record<string, unknown>, key: string): string | null {
    const value = metadata[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  },

  number(metadata: Record<string, unknown>, key: string): number | null {
    const value = metadata[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  },

  stringArray(metadata: Record<string, unknown>, key: string): string[] {
    const value = metadata[key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  },
};
