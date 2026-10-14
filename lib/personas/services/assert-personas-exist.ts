import { inArray } from "drizzle-orm";

import { personas } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

/** Throws `NotFoundError` for the first persona id that does not exist. */
export async function assertPersonasExist(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const rows = await db
    .select({ id: personas.id })
    .from(personas)
    .where(inArray(personas.id, ids));

  const found = new Set(rows.map((row) => row.id));
  const missing = ids.find((id) => !found.has(id));
  if (missing) throw new NotFoundError("persona", missing);
}
