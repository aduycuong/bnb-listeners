import { sql } from "drizzle-orm";

/**
 * Join aliases for the effective sentiment of a mention (`m`): the label
 * when there is one, else Enrich (D13/D14). Callers that already join
 * `item_labels` as `il` should only add `effectiveSentimentMsJoin`.
 */
export const effectiveSentimentMsJoin = sql`
  left join mention_sentiments ms on ms.mention_id = m.id`;

export const effectiveSentimentIlJoin = sql`
  left join item_labels il on il.project_id = m.project_id and il.content_item_id = m.content_item_id`;

export const effectiveSentimentJoins = sql`${effectiveSentimentMsJoin}${effectiveSentimentIlJoin}`;

/** Label sentiment, else Enrich's. */
export const effectiveSentimentSql = sql`coalesce(il.sentiment, ms.sentiment)`;

export const autoSentimentSql = sql`ms.sentiment`;
export const emotionSql = sql`ms.emotion`;
