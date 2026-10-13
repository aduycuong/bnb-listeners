import { and, count, desc, eq, ilike, sql } from "drizzle-orm";

import { authors, contentItems, sources } from "@/db/schema";
import { db } from "@/lib/db";

import type {
  AdminContentItemRow,
  ListAdminContentItemsParams,
  PageResult,
} from "../types";
import { contentItemRowColumns, toContentItemRow } from "../utils/content-item-row";
import { resolvePage } from "../utils/resolve-page";

/** Content items newest first (by `published_at`), filtered and paged. */
export async function listAdminContentItems(
  params: ListAdminContentItemsParams,
): Promise<PageResult<AdminContentItemRow>> {
  const { page, pageSize, offset } = resolvePage(params);
  const q = params.q?.trim();

  const where = and(
    params.sourceId ? eq(contentItems.sourceId, params.sourceId) : undefined,
    params.kind ? eq(contentItems.kind, params.kind) : undefined,
    params.origin ? eq(contentItems.origin, params.origin) : undefined,
    params.collectRunId ? eq(contentItems.collectRunId, params.collectRunId) : undefined,
    q ? ilike(contentItems.text, `%${q}%`) : undefined,
  );

  const [rows, [total]] = await Promise.all([
    db
      .select(contentItemRowColumns)
      .from(contentItems)
      .leftJoin(sources, eq(sources.id, contentItems.sourceId))
      .leftJoin(authors, eq(authors.id, contentItems.authorId))
      .where(where)
      .orderBy(sql`${contentItems.publishedAt} desc nulls last`, desc(contentItems.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(contentItems).where(where),
  ]);

  return {
    items: rows.map((row) => toContentItemRow(row)),
    total: total?.value ?? 0,
    page,
    pageSize,
  };
}
