import { z } from "zod";

/**
 * Provider field types drift (a count arrives as 518299.99999999994, a list as
 * an object in another dataset). Only the ids a row cannot do without are
 * strict; any other field that does not match becomes null instead of dropping
 * the whole row.
 */
export function optional<T extends z.ZodType>(schema: T) {
  return schema.nullish().catch(null);
}

/** Counts can arrive as floats; they are rounded. */
export const count = optional(z.number().transform(Math.round));
