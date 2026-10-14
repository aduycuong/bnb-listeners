import { inArray } from "drizzle-orm";

import { sources } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { ProjectMode } from "../schema";

/** Sources must exist; live projects may only follow real (`origin = connector`) sources. */
export async function assertSourcesSelectable(params: {
  sourceIds: string[];
  mode: ProjectMode;
}): Promise<void> {
  const ids = [...new Set(params.sourceIds)];
  if (ids.length === 0) return;

  const rows = await db
    .select({ id: sources.id, name: sources.name, origin: sources.origin })
    .from(sources)
    .where(inArray(sources.id, ids));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = ids.find((id) => !byId.has(id));
  if (missing) throw new NotFoundError("source", missing);

  if (params.mode === "live") {
    const fake = rows.find((row) => row.origin !== "connector");
    if (fake) {
      throw new InvalidInputError(
        `Project live chỉ theo dõi nguồn thật; "${fake.name ?? fake.id}" là nguồn ${fake.origin}.`,
      );
    }
  }
}
