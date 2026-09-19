import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";

export const ANONYMOUS_AUTHOR_LABEL = "Ẩn danh";

type DocumentHeadingSource = {
  docType: string;
  authorName: string | null;
  publishedAt: string | Date | null;
  createdAt: string | Date;
};

function formatHeadingDate(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

/**
 * Human-readable heading for a document that has no title (all social docs):
 * `<author> · <date>`, or `Thảo luận bài đăng của <author> · <date>` for
 * discussion documents. Falls back to "Ẩn danh" when the author is unknown.
 */
export function buildDocumentHeading(doc: DocumentHeadingSource): string {
  const author = doc.authorName?.trim() || ANONYMOUS_AUTHOR_LABEL;
  const subject =
    doc.docType === DISCUSSION_DOC_TYPE
      ? `Thảo luận bài đăng của ${author}`
      : author;

  return `${subject} · ${formatHeadingDate(doc.publishedAt ?? doc.createdAt)}`;
}
