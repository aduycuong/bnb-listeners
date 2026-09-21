import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { DOCUMENT_TYPE_POST } from "@/lib/documents/document-config";
import type { RetrievedChunk } from "@/lib/retrieval/types";

import type { FindingAttachment } from "../types";

type InternalFindingExtras = {
  attachments?: FindingAttachment[];
  docContext?: string | null;
};

/**
 * Builds the finding content for an internal chunk, layering in the
 * enrichments requested for research:
 * - post + image chunk → embed the image as Markdown,
 * - post + text chunk → list media attachments,
 * - discussion → prepend the parent post as discussion context,
 * - post → append engagement counters.
 *
 * Everything is folded into the content string so it reads uniformly with web
 * findings when passed to the evaluate/synthesize prompts.
 */
export function formatInternalFinding(
  chunk: RetrievedChunk,
  extras: InternalFindingExtras = {},
): string {
  const isPost = chunk.docType === DOCUMENT_TYPE_POST;
  const isDiscussion = chunk.docType === DISCUSSION_DOC_TYPE;
  const sections: string[] = [];

  if (isDiscussion && extras.docContext?.trim()) {
    sections.push(
      `Discussion topic (parent post):\n${extras.docContext.trim()}`,
    );
  }

  sections.push(chunk.content);

  if (isPost && chunk.contentType === "image" && chunk.mediaUrl) {
    sections.push(`![image](${chunk.mediaUrl})`);
  }

  if (isPost && chunk.contentType === "text" && extras.attachments?.length) {
    const lines = extras.attachments.map((attachment) => {
      const description = attachment.summary?.trim() || "(no description)";
      const url = attachment.url ? ` (${attachment.url})` : "";
      return `- [${attachment.type}] ${description}${url}`;
    });
    sections.push(`Attachments:\n${lines.join("\n")}`);
  }

  if (isPost) {
    sections.push(
      `Engagement: views ${chunk.viewCount}, likes ${chunk.likeCount}, comments ${chunk.commentCount}, shares ${chunk.shareCount}`,
    );
  }

  return sections.join("\n\n");
}
