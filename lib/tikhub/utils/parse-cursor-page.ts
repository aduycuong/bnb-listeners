import { z } from "zod";

import type { TikHubCursorPage } from "../types";

const cursorValueSchema = z.union([z.string(), z.number()]).nullish();

/** `has_more` arrives as 0/1 on some endpoints and as a boolean on others. */
const hasMoreSchema = z
  .union([z.boolean(), z.number()])
  .nullish()
  .transform((value) => value === true || value === 1);

const pagedDataSchema = z.object({
  cursor: cursorValueSchema,
  max_cursor: cursorValueSchema,
  has_more: hasMoreSchema,
  hasMore: hasMoreSchema,
});

/**
 * Reads one page of a cursor-paged list out of an envelope's `data`. The list
 * key differs per endpoint (`itemList`, `comments`, …) and is `null` when the
 * page is empty. Items that are not objects are dropped.
 */
export function parseCursorPage(
  data: unknown,
  listKey: string,
): TikHubCursorPage {
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const paged = pagedDataSchema.parse(record);
  const list = record[listKey];

  const cursor = paged.cursor ?? paged.max_cursor;

  return {
    items: Array.isArray(list)
      ? list.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && !Array.isArray(item),
        )
      : [],
    cursor: cursor === null || cursor === undefined ? null : String(cursor),
    hasMore: paged.has_more || paged.hasMore,
  };
}
