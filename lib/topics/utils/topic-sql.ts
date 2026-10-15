import { sql, type SQL } from "drizzle-orm";

import { TOPIC_CONFIG, TOPIC_HINT_EMBEDDING_KIND } from "../config";

/** Mentions (`m`) of a project that take part in topics: relevant, enriched, with a hint. */
export function eligibleMentionSql(projectId: string): SQL {
  return sql`m.project_id = ${projectId}::uuid and m.is_relevant and m.enrich_status = 'done' and m.topic_hint is not null`;
}

/** The embedding (`e`) of mention `m` is current: its hint text under the current model. */
export function currentEmbeddingSql(): SQL {
  return sql`e.mention_id = m.id and e.kind = ${TOPIC_HINT_EMBEDDING_KIND} and e.model = ${TOPIC_CONFIG.embeddingModel} and e.text_hash = md5(m.topic_hint)`;
}

/** A Postgres uuid[] literal, for `= any(...)` with many ids in one parameter. */
export function uuidArraySql(ids: string[]): SQL {
  return sql`${`{${ids.join(",")}}`}::uuid[]`;
}
