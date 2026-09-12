import { and, asc, eq, gt, or } from "drizzle-orm";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";

export type RebuildTermRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

/**
 * Paginate all workspace terms in stable (createdAt, id) order.
 * Membership filtering happens in the batch processor — not here — so the
 * cursor never loops when members are added mid-run.
 */
export async function fetchRebuildTermBatch(params: {
  workspaceId: string;
  limit: number;
  cursor: { createdAt: string; termId: string } | null;
}): Promise<RebuildTermRow[]> {
  const { workspaceId, limit, cursor } = params;
  const conditions = [eq(terms.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(
      or(
        gt(terms.createdAt, new Date(cursor.createdAt)),
        and(
          eq(terms.createdAt, new Date(cursor.createdAt)),
          gt(terms.id, cursor.termId),
        ),
      )!,
    );
  }

  return db
    .select({
      id: terms.id,
      name: terms.name,
      description: terms.description,
      createdAt: terms.createdAt,
    })
    .from(terms)
    .where(and(...conditions))
    .orderBy(asc(terms.createdAt), asc(terms.id))
    .limit(limit);
}
