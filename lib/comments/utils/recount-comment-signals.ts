import { and, eq, sql } from "drizzle-orm";

import { comments } from "@/db/schema";
import { db } from "@/lib/db";

import type { CommentRole, CommentStance } from "../types";

export type CommentSignalCounts = {
  debateCount: number;
  answerCount: number;
  infoCount: number;
  agreeCount: number;
  disagreeCount: number;
  neutralCount: number;
};

/**
 * Recounts role and stance tallies for a parent document from scored comments.
 *
 * Role tallies count every scored row. Stance tallies only count rows with
 * role = `debate`, so answers/info cannot inflate agree/disagree.
 */
export async function recountCommentSignals(
  documentId: string,
): Promise<CommentSignalCounts> {
  const [roleRows, stanceRows] = await Promise.all([
    db
      .select({
        role: comments.role,
        count: sql<number>`count(*)::int`,
      })
      .from(comments)
      .where(
        and(
          eq(comments.documentId, documentId),
          sql`${comments.role} IS NOT NULL`,
        ),
      )
      .groupBy(comments.role),
    db
      .select({
        stance: comments.stance,
        count: sql<number>`count(*)::int`,
      })
      .from(comments)
      .where(
        and(
          eq(comments.documentId, documentId),
          eq(comments.role, "debate"),
          sql`${comments.stance} IS NOT NULL`,
        ),
      )
      .groupBy(comments.stance),
  ]);

  const counts: CommentSignalCounts = {
    debateCount: 0,
    answerCount: 0,
    infoCount: 0,
    agreeCount: 0,
    disagreeCount: 0,
    neutralCount: 0,
  };

  for (const row of roleRows) {
    const role = row.role as CommentRole | null;
    const n = Number(row.count);
    if (role === "debate") counts.debateCount = n;
    else if (role === "answer") counts.answerCount = n;
    else if (role === "info") counts.infoCount = n;
  }

  for (const row of stanceRows) {
    const stance = row.stance as CommentStance | null;
    const n = Number(row.count);
    if (stance === "agree") counts.agreeCount = n;
    else if (stance === "disagree") counts.disagreeCount = n;
    else if (stance === "neutral") counts.neutralCount = n;
  }

  return counts;
}
