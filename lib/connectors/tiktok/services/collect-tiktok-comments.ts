import { fetchTiktokCommentRepliesPage } from "@/lib/tikhub/services/fetch-tiktok-comment-replies-page";
import { fetchTiktokVideoCommentsPage } from "@/lib/tikhub/services/fetch-tiktok-video-comments-page";

import { assertWithinRunBudget } from "../utils/assert-within-run-budget";

type CollectTiktokCommentsParams = {
  videoIds: string[];
  /** Rows per video, replies included. */
  limitPerVideo: number;
  includeReplies: boolean;
  pageSize: number;
  deadlineAt?: number;
  fetchComments?: typeof fetchTiktokVideoCommentsPage;
  fetchReplies?: typeof fetchTiktokCommentRepliesPage;
  now?: () => number;
};

type VideoCommentStats = {
  videoId: string;
  comments: number;
  replies: number;
  /** False when the time budget ran out before the video was done. */
  complete: boolean;
};

export type CollectTiktokCommentsResult = {
  /** Raw comments and replies, each tagged with its video in `aweme_id`. */
  records: Record<string, unknown>[];
  requests: number;
  videos: VideoCommentStats[];
};

function isTimeout(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ERR_TIKTOK_RUN_TIMEOUT";
}

/**
 * Comments of each video: top-level comments first (up to the row limit), then
 * replies to them in order while rows remain. Unlike a channel scan, a partial
 * result is useful, so running out of time keeps what was read and marks the
 * videos left unfinished. Any other failure aborts the run.
 */
export async function collectTiktokComments(
  params: CollectTiktokCommentsParams,
): Promise<CollectTiktokCommentsResult> {
  const fetchComments = params.fetchComments ?? fetchTiktokVideoCommentsPage;
  const fetchReplies = params.fetchReplies ?? fetchTiktokCommentRepliesPage;
  const records: Record<string, unknown>[] = [];
  const videos: VideoCommentStats[] = [];
  let requests = 0;

  for (const videoId of params.videoIds) {
    const stats: VideoCommentStats = { videoId, comments: 0, replies: 0, complete: true };
    videos.push(stats);

    const tag = (row: Record<string, unknown>) => ({ ...row, aweme_id: row.aweme_id ?? videoId });
    const seen = new Set<string>();
    const topLevel: Record<string, unknown>[] = [];
    const rowsLeft = () => params.limitPerVideo - stats.comments - stats.replies;

    try {
      let cursor: string | null = null;

      while (rowsLeft() > 0) {
        assertWithinRunBudget(params.deadlineAt, params.now);
        const page = await fetchComments({ videoId, cursor, count: params.pageSize });
        requests++;

        for (const comment of page.items) {
          const cid = typeof comment.cid === "string" ? comment.cid : null;
          if (!cid || seen.has(cid) || rowsLeft() <= 0) continue;
          seen.add(cid);
          topLevel.push(comment);
          records.push(tag(comment));
          stats.comments++;
        }

        if (!page.hasMore || !page.cursor || page.cursor === cursor || page.items.length === 0) {
          break;
        }
        cursor = page.cursor;
      }

      if (params.includeReplies) {
        for (const comment of topLevel) {
          const replyTotal = Number(comment.reply_comment_total ?? 0);
          const commentId = comment.cid as string;
          if (replyTotal <= 0) continue;

          let replyCursor: string | null = null;

          while (rowsLeft() > 0) {
            assertWithinRunBudget(params.deadlineAt, params.now);
            const page = await fetchReplies({
              videoId,
              commentId,
              cursor: replyCursor,
              count: params.pageSize,
            });
            requests++;

            for (const reply of page.items) {
              const cid = typeof reply.cid === "string" ? reply.cid : null;
              if (!cid || seen.has(cid) || rowsLeft() <= 0) continue;
              seen.add(cid);
              records.push(tag(reply));
              stats.replies++;
            }

            if (!page.hasMore || !page.cursor || page.cursor === replyCursor || page.items.length === 0) {
              break;
            }
            replyCursor = page.cursor;
          }

          if (rowsLeft() <= 0) break;
        }
      }
    } catch (error) {
      if (!isTimeout(error)) throw error;

      // Out of time: this video and the ones after it stay unfinished.
      stats.complete = false;
      for (const rest of params.videoIds.slice(videos.length)) {
        videos.push({ videoId: rest, comments: 0, replies: 0, complete: false });
      }
      break;
    }
  }

  return { records, requests, videos };
}
