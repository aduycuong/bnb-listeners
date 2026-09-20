import type { ListSortOption } from "@/lib/dashboard/filter-sort-list-items";

type DocumentListParentOrderItem = {
  id: string;
  date: string;
  name: string;
};

export type OrderedDocumentListItem<T extends DocumentListParentOrderItem> = {
  item: T;
  isChild: boolean;
};

function compareBySortOption<T extends DocumentListParentOrderItem>(
  left: T,
  right: T,
  sort: ListSortOption,
): number {
  switch (sort) {
    case "name-asc":
      return left.name.localeCompare(right.name);
    case "name-desc":
      return right.name.localeCompare(left.name);
    case "date-asc":
      return left.date.localeCompare(right.date);
    case "date-desc":
    default:
      return right.date.localeCompare(left.date);
  }
}

export function orderDocumentListByParent<T extends DocumentListParentOrderItem>(
  items: T[],
  parentDocumentIdById: Map<string, string | null>,
  sort: ListSortOption,
): OrderedDocumentListItem<T>[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const childrenByParentId = new Map<string, T[]>();

  for (const item of items) {
    const parentId = parentDocumentIdById.get(item.id);
    if (!parentId || !itemById.has(parentId)) {
      continue;
    }

    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(item);
    childrenByParentId.set(parentId, siblings);
  }

  for (const children of childrenByParentId.values()) {
    children.sort((left, right) => compareBySortOption(left, right, sort));
  }

  const childIds = new Set<string>();
  for (const children of childrenByParentId.values()) {
    for (const child of children) {
      childIds.add(child.id);
    }
  }

  const ordered: OrderedDocumentListItem<T>[] = [];

  for (const item of items) {
    if (childIds.has(item.id)) {
      continue;
    }

    ordered.push({ item, isChild: false });

    const children = childrenByParentId.get(item.id);
    if (!children) {
      continue;
    }

    for (const child of children) {
      ordered.push({ item: child, isChild: true });
    }
  }

  return ordered;
}

export type DocumentParentChildItem = {
  id: string;
  parentDocumentId: string | null;
};

export type DocumentParentChildGroup<T extends DocumentParentChildItem> = {
  root: T;
  children: T[];
};

export type DocumentListItemGroup<T extends DocumentListParentOrderItem> = {
  root: T;
  children: T[];
};

export function groupDocumentCardItemsInOrder<
  T extends DocumentParentChildItem,
>(items: T[]): DocumentParentChildGroup<T>[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const childrenByParentId = new Map<string, T[]>();

  for (const item of items) {
    if (!item.parentDocumentId || !itemById.has(item.parentDocumentId)) {
      continue;
    }

    const siblings = childrenByParentId.get(item.parentDocumentId) ?? [];
    siblings.push(item);
    childrenByParentId.set(item.parentDocumentId, siblings);
  }

  const childIds = new Set<string>();
  for (const children of childrenByParentId.values()) {
    for (const child of children) {
      childIds.add(child.id);
    }
  }

  const groups: DocumentParentChildGroup<T>[] = [];

  for (const item of items) {
    if (childIds.has(item.id)) {
      continue;
    }

    groups.push({
      root: item,
      children: childrenByParentId.get(item.id) ?? [],
    });
  }

  return groups;
}

export function groupDocumentListItems<T extends DocumentListParentOrderItem>(
  orderedItems: OrderedDocumentListItem<T>[],
): DocumentListItemGroup<T>[] {
  const groups: DocumentListItemGroup<T>[] = [];

  for (const { item, isChild } of orderedItems) {
    if (isChild) {
      groups.at(-1)?.children.push(item);
      continue;
    }

    groups.push({ root: item, children: [] });
  }

  return groups;
}
