import { and, eq, ne } from "drizzle-orm";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";

export async function findTermByName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  const conditions = [
    eq(terms.workspaceId, workspaceId),
    eq(terms.name, name),
  ];

  if (excludeId) {
    conditions.push(ne(terms.id, excludeId));
  }

  const [existing] = await db
    .select({ id: terms.id, name: terms.name })
    .from(terms)
    .where(and(...conditions))
    .limit(1);

  return existing ?? null;
}
