import { DocumentListChildBranch } from "@/components/documents/document-list-child-branch";
import { DocumentListItemCard } from "@/components/documents/document-list-item-card";
import type { DocumentCardItem } from "@/lib/documents/types";
import type { DocumentParentChildGroup } from "@/lib/documents/utils/order-document-list-by-parent";

type DocumentListGroupItemProps = {
  group: DocumentParentChildGroup<DocumentCardItem>;
  workspaceIndex: number;
};

export function DocumentListGroupItem({
  group,
  workspaceIndex,
}: DocumentListGroupItemProps) {
  return (
    <li className="flex flex-col gap-2.5">
      <DocumentListItemCard
        document={group.root}
        workspaceIndex={workspaceIndex}
      />

      {group.children.length > 0 ? (
        <ul className="flex flex-col gap-2.5 pl-1 sm:pl-2">
          {group.children.map((child, childIndex) => (
            <li key={child.id} className="flex gap-1.5 sm:gap-2">
              <DocumentListChildBranch
                isFirst={childIndex === 0}
                isLast={childIndex === group.children.length - 1}
              />
              <div className="min-w-0 flex-1">
                <DocumentListItemCard
                  document={child}
                  workspaceIndex={workspaceIndex}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
