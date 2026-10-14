import { inArray } from "drizzle-orm";

import { alertRules, projectAspects, projectEntities } from "@/db/schema";
import { InvalidInputError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

/** New entity, aspect and rule ids come from the client; reject ids already in use. */
export async function assertConfigIdsUnused(ids: {
  entityIds: string[];
  aspectIds: string[];
  ruleIds: string[];
}): Promise<void> {
  const [entities, aspects, rules] = await Promise.all([
    ids.entityIds.length
      ? db
          .select({ id: projectEntities.id })
          .from(projectEntities)
          .where(inArray(projectEntities.id, ids.entityIds))
      : [],
    ids.aspectIds.length
      ? db
          .select({ id: projectAspects.id })
          .from(projectAspects)
          .where(inArray(projectAspects.id, ids.aspectIds))
      : [],
    ids.ruleIds.length
      ? db.select({ id: alertRules.id }).from(alertRules).where(inArray(alertRules.id, ids.ruleIds))
      : [],
  ]);

  const taken = [...entities, ...aspects, ...rules][0];
  if (taken) {
    throw new InvalidInputError(`Id ${taken.id} đã được dùng. Tải lại trang rồi thử lại.`);
  }

  const all = [...ids.entityIds, ...ids.aspectIds, ...ids.ruleIds];
  if (new Set(all).size !== all.length) {
    throw new InvalidInputError("Cấu hình có id bị trùng.");
  }
}
