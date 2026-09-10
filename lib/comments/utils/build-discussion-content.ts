import type { Comment } from "@/db/schema";

import type { CommentRole, CommentStance } from "../types";

const ROLE_LABEL: Record<CommentRole, string> = {
  debate: "tranh luận",
  answer: "trả lời",
  info: "bổ sung thông tin",
  other: "khác",
};

const STANCE_LABEL: Record<CommentStance, string> = {
  agree: "đồng tình",
  disagree: "phản đối",
  neutral: "trung lập",
};

/**
 * Flattens substantive comments into the rawContent of a discussion document.
 * Each comment keeps its author, date, role, and (for debates) stance so the
 * agent can cite them with the right framing.
 */
export function buildDiscussionContent(
  comments: Pick<
    Comment,
    "authorName" | "content" | "publishedAt" | "role" | "stance"
  >[],
): string {
  return comments
    .map((comment) => {
      const parts: string[] = [];
      const author = comment.authorName?.trim();
      if (author) parts.push(author);

      if (comment.publishedAt) {
        parts.push(comment.publishedAt.toISOString().slice(0, 10));
      }

      const role = comment.role as CommentRole | null;
      if (role && role in ROLE_LABEL) {
        parts.push(ROLE_LABEL[role]);
      }

      if (role === "debate") {
        const stance = comment.stance as CommentStance | null;
        if (stance && stance in STANCE_LABEL) {
          parts.push(STANCE_LABEL[stance]);
        }
      }

      const header = parts.length > 0 ? `[${parts.join(" · ")}]` : "[ẩn danh]";
      return `${header}\n${comment.content.trim()}`;
    })
    .join("\n\n");
}
