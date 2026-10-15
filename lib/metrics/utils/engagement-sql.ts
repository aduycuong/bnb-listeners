import { sql, type SQL } from "drizzle-orm";

/**
 * Engagement of one item: likes + comments (replies, for a comment) + shares of the item itself.
 * Replaces reach on real projects until a source gives views (phase 5b).
 */
export function engagementSql(item: SQL): SQL {
  return sql`(${item}.like_count + ${item}.comment_count + ${item}.share_count)`;
}
