"use client";

import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import {
  DOCUMENT_TYPE_POST,
  getDocumentTypeBadge,
} from "@/lib/documents/document-config";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  type LucideIcon,
} from "lucide-react";

function getDocumentTypeIcon(docType: string): LucideIcon {
  switch (docType) {
    case DISCUSSION_DOC_TYPE:
      return MessagesSquareIcon;
    case DOCUMENT_TYPE_POST:
      return MessageSquareIcon;
    default:
      return FileTextIcon;
  }
}

type DocumentTypeBadgeProps = {
  docType: string;
  className?: string;
};

export function DocumentTypeBadge({ docType, className }: DocumentTypeBadgeProps) {
  const badge = getDocumentTypeBadge(docType);
  const Icon = getDocumentTypeIcon(docType);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        badge.className,
        className,
      )}
    >
      <Icon className="size-3" />
      {badge.label}
    </span>
  );
}
