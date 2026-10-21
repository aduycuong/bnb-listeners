import { sql, type SQL } from "drizzle-orm";

import { getTopicStage, type TopicStageSpec } from "../config";

/** `x.data->>'text'` or `x.data->>'question'` for the stage's extraction. */
export function hintTextSql(spec: TopicStageSpec): SQL {
  return sql.raw(`x.data->>'${spec.hintField}'`);
}

/**
 * Mentions (`m`) of a project that take part in a grouping stage: relevant
 * and with a raw extraction for that kind (D15/D18).
 */
export function eligibleMentionSql(projectId: string, spec: TopicStageSpec = getTopicStage()): SQL {
  return sql`m.project_id = ${projectId}::uuid and m.is_relevant
    and exists (
      select 1 from mention_extractions x
      where x.mention_id = m.id and x.schema_key = ${spec.extractionKey}
        and ${hintTextSql(spec)} is not null
    )`;
}

/** A Postgres uuid[] literal, for `= any(...)` with many ids in one parameter. */
export function uuidArraySql(ids: string[]): SQL {
  return sql`${`{${ids.join(",")}}`}::uuid[]`;
}
