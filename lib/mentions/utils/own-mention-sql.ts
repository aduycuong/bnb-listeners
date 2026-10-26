import { sql } from "drizzle-orm";

/**
 * Mention `m` is about the project's own side: Enrich gave it at least one tracked entity
 * that is not a competitor (`primary`, `product`, `area`). Mentions only about competitors
 * and mentions without an entity are left out of the reports (D26); share of voice and the
 * competitor comparisons read competitor mentions on their own.
 */
export const ownMentionSql = sql`exists (
  select 1 from mention_entities own_me
  join project_entities own_pe on own_pe.id = own_me.entity_id
  where own_me.mention_id = m.id and own_pe.role <> 'competitor'
)`;
