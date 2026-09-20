import { documentCardItemToListRowItem } from "@/components/documents/document-list-item-card";
import {
  filterSortListItems,
  type ListSortOption,
} from "@/lib/dashboard/filter-sort-list-items";
import type { DocumentCardItem } from "@/lib/documents/types";
import {
  groupDocumentListItems,
  orderDocumentListByParent,
  type DocumentParentChildGroup,
} from "@/lib/documents/utils/order-document-list-by-parent";

export function buildDocumentListGroups(
  cardItems: DocumentCardItem[],
  keyword: string,
  sort: ListSortOption,
): DocumentParentChildGroup<DocumentCardItem>[] {
  const cardItemsById = new Map(cardItems.map((item) => [item.id, item]));
  const listItems = filterSortListItems(
    cardItems.map(documentCardItemToListRowItem),
    keyword,
    sort,
  );
  const parentDocumentIdById = new Map(
    cardItems.map((item) => [item.id, item.parentDocumentId]),
  );
  const orderedListItems = orderDocumentListByParent(
    listItems,
    parentDocumentIdById,
    sort,
  );

  return groupDocumentListItems(orderedListItems).flatMap((group) => {
    const root = cardItemsById.get(group.root.id);
    if (!root) {
      return [];
    }

    return [
      {
        root,
        children: group.children.flatMap((child) => {
          const document = cardItemsById.get(child.id);
          return document ? [document] : [];
        }),
      },
    ];
  });
}
