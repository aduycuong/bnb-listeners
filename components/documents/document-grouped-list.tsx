import {
  DOCUMENT_LIST_ITEM_SKELETON_CLASS,
} from "@/components/documents/document-list-item-card";
import { DocumentListGroupItem } from "@/components/documents/document-list-group-item";
import type { DocumentCardItem } from "@/lib/documents/types";
import type { DocumentParentChildGroup } from "@/lib/documents/utils/order-document-list-by-parent";
import { Skeleton } from "@/components/ui/skeleton";

type DocumentGroupedListProps = {
  groups: DocumentParentChildGroup<DocumentCardItem>[];
  workspaceIndex: number;
  isFetchingMore?: boolean;
};

export function DocumentGroupedList({
  groups,
  workspaceIndex,
  isFetchingMore = false,
}: DocumentGroupedListProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <DocumentListGroupItem
          key={group.root.id}
          group={group}
          workspaceIndex={workspaceIndex}
        />
      ))}

      {isFetchingMore
        ? Array.from({ length: 2 }).map((_, index) => (
            <li key={`loading-${index}`}>
              <Skeleton className={DOCUMENT_LIST_ITEM_SKELETON_CLASS} />
            </li>
          ))
        : null}
    </ul>
  );
}
