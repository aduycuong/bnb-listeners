import { sql, type SQL } from "drizzle-orm";

/** Mentions (`m`) of a project that take part in topics: relevant, enriched, with a hint. */
export function eligibleMentionSql(projectId: string): SQL {
  return sql`m.project_id = ${projectId}::uuid and m.is_relevant and m.enrich_status = 'done' and m.topic_hint is not null`;
}

/** A Postgres uuid[] literal, for `= any(...)` with many ids in one parameter. */
export function uuidArraySql(ids: string[]): SQL {
  return sql`${`{${ids.join(",")}}`}::uuid[]`;
}
